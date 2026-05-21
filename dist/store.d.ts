import { z } from '@arki/contracts';
import type { CanHandle, Event, ReadEvent } from '@event-driven-io/emmett';
import type { PostgresEventStore, PostgresEventStoreOptions, PostgreSQLProjectionHandlerContext, PostgresReadEventMetadata } from '@event-driven-io/emmett-postgresql';
import type { TablesRelationalConfig } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
export type PostgresReadEvent<EventType extends Event> = ReadEvent<EventType, PostgresReadEventMetadata>;
export { defaultPostgreSQLOptions, PostgreSQLEventStoreDefaultStreamVersion, getPostgreSQLEventStore, postgreSQLProjection, } from '@event-driven-io/emmett-postgresql';
export declare const postgresEventStoreConfigSchema: z.ZodObject<{
    connectionString: z.ZodString;
}, z.core.$strip>;
export type PostgresEventStoreConfig = z.infer<typeof postgresEventStoreConfigSchema>;
export declare const postgresEventStoreOptionsSchema: z.ZodObject<{
    projections: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    schema: z.ZodOptional<z.ZodObject<{
        autoMigration: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    connectionOptions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    hooks: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$loose>;
export type PostgresEventStoreOptionsInput = z.infer<typeof postgresEventStoreOptionsSchema>;
export type EventStoreWithCleanup = {
    eventStore: PostgresEventStore;
    close: () => Promise<void>;
};
export declare const getEventStore: (connectionString: string, options?: PostgresEventStoreOptions) => EventStoreWithCleanup;
export declare const normalizePostgresEventStoreOptions: (options?: unknown) => PostgresEventStoreOptions;
export declare const createPostgresEventStore: (config: unknown, options?: unknown) => PostgresEventStore;
export type DrizzleProjectionHandlerContext<TSchema extends TablesRelationalConfig> = PostgreSQLProjectionHandlerContext & {
    db: NodePgDatabase<TSchema>;
};
export { projections, type CanHandle } from '@event-driven-io/emmett';
export declare const drizzleProjection: <EventType extends Event, TSchema extends TablesRelationalConfig>(db: NodePgDatabase<TSchema>, { handle, canHandle, }: {
    handle: (events: PostgresReadEvent<EventType>[], context: DrizzleProjectionHandlerContext<TSchema>) => Promise<void>;
    canHandle: CanHandle<EventType>;
}) => import("@event-driven-io/emmett-postgresql").PostgreSQLProjectionDefinition<EventType>;
export type DrizzleProjectionHandlerContextWithRepo<TRepos> = PostgreSQLProjectionHandlerContext & {
    repos: TRepos;
};
export declare const drizzleWithRepoProjection: <EventType extends Event, TRepos>(repos: TRepos, { handle, canHandle, }: {
    handle: (events: PostgresReadEvent<EventType>[], context: DrizzleProjectionHandlerContextWithRepo<TRepos>) => Promise<void>;
    canHandle: CanHandle<EventType>;
}) => import("@event-driven-io/emmett-postgresql").PostgreSQLProjectionDefinition<EventType>;
export { type PostgresEventStore, type PostgresEventStoreConnectionOptions, type PostgreSQLProjectionHandlerContext, type PostgresReadEventMetadata } from '@event-driven-io/emmett-postgresql';
//# sourceMappingURL=store.d.ts.map