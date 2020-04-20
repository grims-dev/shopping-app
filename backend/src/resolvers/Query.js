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
};

module.exports = Query;
