import type { Event, EventStore, MessageBus, MessageProcessor } from '@event-driven-io/emmett';
import type { CommandHandlerRegistration } from './command.js';
import type { PostgresEventStore } from './store.js';
/**
 * Structural interface for projection definitions accepted by
 * {@link initEventSourcing}.
 *
 * Uses method syntax for `handle` to enable TypeScript's bivariant parameter
 * checking, which allows heterogeneous projection arrays where each projection
 * is parametrised on a different event type.
 *
 * Accepts projections produced by three different builder patterns:
 * 1. Emmett's `postgreSQLProjection` / `PostgreSQLProjectionDefinition<E>`.
 * 2. The `defineProjection` builder from this package.
 * 3. The `@arki/db` builder `projection.named().on().handle()`.
 */
export type PostgreSQLProjectionInput = {
    name?: string;
    canHandle: string[];
    handle(events: Event[], context: object): void;
};
/** Alternative names for the Event Store connection URL environment variable. */
export declare const EVENT_STORE_URL_VARIANTS: string[];
/**
 * Event sourcing wiring helpers.
 *
 * Bundles the three most common bootstrap operations into a single namespace:
 *
 * - {@link eventSourcingFeatures.initEventSourcing} — open the PostgreSQL
 *   event store with a set of inline projections, returning a `close()`
 *   function for graceful shutdown.
 * - {@link eventSourcingFeatures.initMessageBus} — create an in-memory
 *   message bus and register a list of command handler descriptors against it.
 * - {@link eventSourcingFeatures.setupProcessManagers} — attach process
 *   manager consumers to the event store, start them, and wire SIGTERM-driven
 *   graceful shutdown.
 *
 * The helpers are intentionally framework-agnostic: any composition root
 * (DI container, plugin, plain `bus.ts` factory function) can call them.
 */
export declare const eventSourcingFeatures: {
    /**
     * Initialises the PostgreSQL event store with the given inline projections.
     *
     * @param p Projections to register inline on the event store.
     * @param dbUrl Connection string for the event store. When omitted, an
     *   error is thrown that names the recognised environment variables.
     * @returns The event store handle plus a `close()` function that releases
     *   the underlying connection pool.
     */
    initEventSourcing(p: readonly PostgreSQLProjectionInput[], dbUrl?: string): {
        eventStore: PostgresEventStore;
        close: () => Promise<void>;
    };
    /**
     * Creates an in-memory message bus and registers a list of command handlers.
     *
     * Each registration is bound to the event store so command handlers can
     * load and append to streams. If the event store is missing, a warning is
     * logged and an empty bus is returned.
     *
     * @param eventStore Event store used to load and append streams.
     * @param commandHandlers Command handler descriptors to register.
     * @returns A message bus with handlers attached.
     */
    initMessageBus(eventStore: EventStore | undefined, commandHandlers: CommandHandlerRegistration[]): MessageBus;
    /**
     * Attaches process managers as event store consumers, starts them, and
     * wires SIGTERM-driven shutdown of the resulting consumers.
     *
     * @param eventStore Event store the process managers consume from.
     * @param processManagers Process manager `MessageProcessor` instances to
     *   register, typically produced by {@link createProcessManager},
     *   {@link createStatefulProcessManager}, or
     *   `createSimpleProcessManager`.
     * @returns The started consumer handles. Useful for tests that need to
     *   stop them explicitly.
     */
    setupProcessManagers(eventStore: PostgresEventStore, processManagers: MessageProcessor[]): Promise<import("@event-driven-io/emmett-postgresql").PostgreSQLEventStoreConsumer<Event>[]>;
};
//# sourceMappingURL=event-sourcing-features.d.ts.map