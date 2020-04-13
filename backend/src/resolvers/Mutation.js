// custom resolver for Mutations

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Mutations = {
    async createItem(parent, args, ctx, info) {
        // TODO: check if logged in

        const item = await ctx.db.mutation.createItem({
            data: { ...args }
        }, info);

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
        const item = await ctx.db.query.item({ where }, `{ id title }`);
        // 2. check if they own that item or have admin permissions
        // TODO
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
    }
};

module.exports = Mutations;
