// custom resolver for Mutations

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const { transport, makeANiceEmail } = require('../mail');
const { hasPermission } = require('../utils');
const stripe = require('../stripe');

const Mutations = {
    async createItem(parent, args, ctx, info) {
        if (!ctx.request.userId) {
            throw new Error('You must be logged in to do that');
        }

        const item = await ctx.db.mutation.createItem(
            {
              data: {
                // This is how to create a relationship between the Item and the User
                user: {
                  connect: {
                    id: ctx.request.userId,
                  },
                },
                ...args,
              },
            },
            info
          );

        return item;
    },

    updateItem(parent, args, ctx, info) {
        // take a copy of the updates
        const updates = { ... args };

        // remove ID from the updates, we don't want to update that
        delete updates.id;

        // run update method
        return ctx.db.mutation.updateItem(
            {
                data: updates,
                where: {
                    id: args.id,
                }
            },
            info
        );
    },

    async deleteItem(parent, args, ctx, info) {
        const where = { id: args.id };
        // 1. find the item
        const item = await ctx.db.query.item({ where }, `{ id title user { id } }`);
        // 2. check if they own that item or have admin permissions
        const ownsItem = item.user.id === ctx.request.userId;
        const hasPermissions = ctx.request.user.permissions.some(permission => ['ADMIN', 'ITEMDELETE'].includes(permission));
        
        if (!ownsItem && !hasPermissions) {
            throw new Error("You don't have permission to do that!");
        }

        // 3. delete
        return ctx.db.mutation.deleteItem({ where }, info);
    },

    async signup(parent, args, ctx, info) {
        // set email to lowercase
        args.email = args.email.toLowerCase();

        // hash password
        const password = await bcrypt.hash(args.password, 10);

        // create user in the database
        const user = await ctx.db.mutation.createUser({
            data: {
                ...args,
                password,
                permissions: { set: ['USER'] },
            }
        }, info);

        // create the JWT token for them
        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

        // set token as a cookie on the response
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxage: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
        });

        // return user to the browser
        return user;
    },
    
    async signin(parent, { email, password }, ctx, info) {
        // check if there is a user with that email
        const user = await ctx.db.query.user({ where: { email } });
        if (!user) {
            throw new Error(`No such user found with email ${email}`);
        }

        // check if password is valid
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            throw new Error('Invalid password!');
        }

        // generate JWT token
        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

        // set token as a cookie on the response
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxage: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
        });

        // return the user
        return user;
    },

    signout(parent, args, ctx, info) {
        ctx.response.clearCookie('token');
        return { message: 'Goodbye!' };
    },

    async requestReset(parent, args, ctx, info) {
        // check if it's a real user
        const user = await ctx.db.query.user({ where: { email: args.email }});
        if (!user) {
            throw new Error(`No users were found with the email ${args.email}`)
        }

        // set a reset token and expiry
        const randomBytesPromiseified = promisify(randomBytes)
        const resetToken = (await randomBytesPromiseified(20)).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // one hour from now
        const res = await ctx.db.mutation.updateUser({
            where: { email: args.email },
            data: { resetToken, resetTokenExpiry },
        });
        
        // email the reset token
        const mailRed = await transport.sendMail({
            from: 'ciarangrimshawdev@gmail.com',
            to: user.email,
            subject: 'Sick Fits password reset request',
            html: makeANiceEmail(`Your password reset token is here!
            \n\n
            <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click Here to Reset</a>`),
        });

        // return message
        return { message: 'Thanks!' };
    },

    async resetPassword(parent, args, ctx, info) {
        // check if passwords match
        if (args.password !== args.confirmPassword) {
            throw new Error('Your passwords do not match. Please try again.');
        }

        // check if reset token is invalid or expired
        const [user] = await ctx.db.query.users({
            where: {
                resetToken: args.resetToken,
                resetTokenExpiry_gte: Date.now() - 3600000
            }
        });
        if (!user) {
            throw new Error('This token is either invalid or expired. Please try again.');
        }

        // hash new password
        const password = await bcrypt.hash(args.password, 10);

        // save new password to the user and remove old resetToken
        const updatedUser = await ctx.db.mutation.updateUser({
            where: { email: user.email },
            data: {
                password,
                resetToken: null,
                resetTokenExpiry: null,
            }
        });

        // generate JWT
        const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);

        // set JWT cookie
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365
        })

        // return the new user
        return updatedUser;
    },

    async updatePermissions(parent, args, ctx, info) {
        // check logged in state
        if (!ctx.request.userId) {
            throw new Error('You must be logged in to do this!');
        }

        // query current user
        const currentUser = await ctx.db.query.user(
            {
                where: {
                    id: ctx.request.userId,
                },
            },
            info
        );

        // check if has permissions to do this
        hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE']);

        // update permissions
        return ctx.db.mutation.updateUser(
            {
                data: {
                    permissions: {
                        set: args.permissions,
                    }
                },
                where: {
                    id: args.userId
                },
            },
            info
        );
    },

    async addToCart(parent, args, ctx, info) {
        // make sure they are signed in
        const { userId } = ctx.request;
        if (!userId) {
            throw new Error('Please sign in to add to your cart');
        }

        // query the users' current cart
        const [existingCartItem] = await ctx.db.query.cartItems({
            where: {
                user: { id: userId },
                item: { id: args.id },
            }
        });

        // check if that item is already in the cart and increment by 1 if it is
        if (existingCartItem) {
            return ctx.db.mutation.updateCartItem({
                where: { id: existingCartItem.id },
                data: { quantity: existingCartItem.quantity + 1 },
            },
            info);
        }

        // if not, create fresh CartItem
        return ctx.db.mutation.createCartItem({
            data: {
                user: {
                    connect: { id: userId },
                },
                item: {
                    connect: { id: args.id },
                }
            }
        },
        info);
    },

    async removeFromCart(parent, args, ctx, info) {
        // find the cart item
        const cartItem = await ctx.db.query.cartItem({
            where: {
                id: args.id,
            }
        },
        `{ id, user { id }}`
        );
        if (!cartItem) throw new Error('No cart item found');

        // check they own it
        if (cartItem.user.id !== ctx.request.userId) {
            throw new Error('Cheatin huh?');
        }

        // delete the cart item
        return ctx.db.mutation.deleteCartItem({
            where: { id: args.id },
        }, info);
    },

    async createOrder(parent, args, ctx, info) {
        // query current user to check if signed in
        const { userId } = ctx.request;
        if (!userId) throw new Error('You must be signed in to complete this order');
        const user = await ctx.db.query.user(
        { where: { id: userId } },
            `{
                id
                name
                email
                cart {
                    id
                    quantity
                    item { title price id description image largeImage }
                }
            }`
        );

        // recalculate the total of the price
        const amount = user.cart.reduce(
            (tally, cartItem) => tally + cartItem.item.price * cartItem.quantity,
            0
        );
        console.log(`Going to charge for a total of ${amount}`);

        // create the stripe charge (turn token into $$$)
        const charge = await stripe.charges.create({
            amount: amount,
            currency: 'USD',
            source: args.token,
        });

        // convert the CartItems to OrderItems
        const orderItems = user.cart.map(cartItem => {
            const orderItem = {
                ...cartItem.item,
                quantity: cartItem.quantity, 
                user: { connect: { id: userId } },
            };
            delete orderItem.id;
            return orderItem;
        })

        // create the Order
        const order = await ctx.db.mutation.createOrder({
            data: {
                total: charge.amount,
                charge: charge.id,
                items: { create: orderItems },
                user: { connect: { id: userId } },
            }
        });

        // clean up - clear the user's cart, delete cartItems
        const cartItemIds = user.cart.map(cartItem => cartItem.id);
        await ctx.db.mutation.deleteManyCartItems({
            where: {
                id_in: cartItemIds,
            }
        });

        // return the Order to the client
        return order;
    }
};

module.exports = Mutations;
