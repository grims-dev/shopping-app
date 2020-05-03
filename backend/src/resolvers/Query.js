// custom resolver for Querying

const { forwardTo } = require('prisma-binding');
const { hasPermission } = require('../utils');

const Query = {
    items: forwardTo('db'),
    item: forwardTo('db'),
    itemsConnection: forwardTo('db'),
    me(parent, args, ctx, info) {
        // check for current user ID
        if (!ctx.request.userId) {
            return null;
        }
        return ctx.db.query.user({
            where: { id: ctx.request.userId },
        }, info);
    },
    
    async users(parent, args, ctx, info) {
        // check if they are logged in
        if (!ctx.request.userId) {
            throw new Error('You must be logged in to view this');
        }

        // check if user has permissions
        hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE']);

        // query all the users
        return ctx.db.query.users({}, info);
    },

    async order(parent, args, ctx, info) {
        // make sure they are logged in
        if (!ctx.request.userId) {
            throw new Error(`You aren't logged in!`);
        }

        // query current order
        const order = await ctx.db.query.order({
            where: { id: args.id },
        }, info);

        // check if they have permissions to view this order
        const ownsOrder = order.user.id === ctx.request.userId;
        const hasPermissionToSeeOrder = ctx.request.user.permissions.includes('ADMIN');
        if (!ownsOrder || !hasPermissionToSeeOrder) {
            throw new Error(`You don't have permission to view this. If this is your order, please log in.`);
        }

        // return the order
        return order;
    },

    async orders(parent, args, ctx, info) {
        const { userId } = ctx.request;
        if (!userId) {
            throw new Error('You must be signed in!');
        }

        return ctx.db.query.orders({
            where: {
                user: { id: userId }
            }
        }, info);
    }
};

module.exports = Query;
