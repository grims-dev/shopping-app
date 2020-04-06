// custom resolver for Mutations

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
};

module.exports = Mutations;
