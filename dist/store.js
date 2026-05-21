import { z } from '@arki/contracts';
import { defaultPostgreSQLOptions, getPostgreSQLEventStore, postgreSQLProjection, } from '@event-driven-io/emmett-postgresql';
import { debugProjection, debugStore } from './debug.js';
export { defaultPostgreSQLOptions, PostgreSQLEventStoreDefaultStreamVersion, getPostgreSQLEventStore, postgreSQLProjection, } from '@event-driven-io/emmett-postgresql';
export const postgresEventStoreConfigSchema = z.object({
    connectionString: z.string().min(1, 'PostgreSQL connection string is required'),
});
export const postgresEventStoreOptionsSchema = z
    .object({
    projections: z.array(z.unknown()).optional(),
    schema: z
        .object({
        autoMigration: z.string().min(1).optional(),
    })
        .passthrough()
        .optional(),
    connectionOptions: z.record(z.string(), z.unknown()).optional(),
    hooks: z.record(z.string(), z.unknown()).optional(),
})
    .passthrough();
const mergeEventStoreOptions = (options) => {
    if (!options)
        return { ...defaultPostgreSQLOptions };
    return {
        ...defaultPostgreSQLOptions,
        ...options,
    };
};
export const getEventStore = (connectionString, options = defaultPostgreSQLOptions) => {
    debugStore('Creating event store with connection string and options');
    const eventStore = getPostgreSQLEventStore(connectionString, options);
    debugStore('Event store created successfully');
    return {
        eventStore,
        close: async () => {
            debugStore('Closing event store connection pool');
            try {
                // The emmett-postgresql event store has a close method that closes the underlying Pool
                if (eventStore && typeof eventStore.close === 'function') {
                    await eventStore.close();
                    debugStore('Event store connection pool closed successfully');
                }
                else {
                    debugStore('Event store does not have a close method, skipping');
                }
            }
            catch (error) {
                debugStore('Error closing event store: %O', error);
                throw error;
            }
        },
    };
};
export const normalizePostgresEventStoreOptions = (options) => mergeEventStoreOptions(options === undefined ? undefined : postgresEventStoreOptionsSchema.parse(options));
export const createPostgresEventStore = (config, options) => {
    debugStore('Creating Postgres event store from config');
    const { connectionString } = postgresEventStoreConfigSchema.parse(config);
    debugStore('Config validated successfully');
    const parsedOptions = normalizePostgresEventStoreOptions(options);
    debugStore('Options normalized: projections=%d', parsedOptions.projections?.length ?? 0);
    const eventStore = getPostgreSQLEventStore(connectionString, parsedOptions);
    debugStore('Postgres event store created successfully');
    return eventStore;
};
export { projections } from '@event-driven-io/emmett';
export const drizzleProjection = (db, { handle, canHandle, }) => {
    debugProjection('Creating Drizzle projection with canHandle filter');
    return postgreSQLProjection({
        canHandle,
        handle: async (events, context) => {
            debugProjection('Processing %d events in Drizzle projection', events.length);
            await handle(events, {
                ...context,
                db,
            });
            debugProjection('Drizzle projection processed events successfully');
        },
    });
};
export const drizzleWithRepoProjection = (repos, { handle, canHandle, }) => {
    debugProjection('Creating Drizzle projection with repository injection');
    return postgreSQLProjection({
        canHandle,
        handle: async (events, context) => {
            debugProjection('Processing %d events in Drizzle repo projection', events.length);
            await handle(events, {
                ...context,
                repos,
            });
            debugProjection('Drizzle repo projection processed events successfully');
        },
    });
};
//# sourceMappingURL=store.js.map