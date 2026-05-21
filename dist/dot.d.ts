/**
 * DOT adapter for `@arki/event-sourcing`.
 *
 * Wraps `eventSourcingFeatures.initEventSourcing` + `initMessageBus` as a
 * single `DotPip`. The pip opens the PostgreSQL event store in
 * `boot`, attaches command handlers to an in-memory message bus, publishes
 * both as `services.eventStore` and `services.messageBus`, and closes the
 * event store pool in `dispose` (reverse-topological order).
 *
 * @example
 * ```ts
 * import { defineApp } from '@arki/dot';
 * import { eventSourcing } from '@arki/event-sourcing/dot';
 *
 * const app = await defineApp('my-app')
 *   .use(eventSourcing({
 *     projections: [orderProjection, invoiceProjection],
 *     commandHandlers: [placeOrderHandler, cancelOrderHandler],
 *   }))
 *   .boot();
 *
 * await app.services.messageBus.send({ type: 'PlaceOrder', payload: { ... } });
 * await app.dispose();
 * ```
 *
 * The connection URL is resolved in this order:
 *   1. `options.dbUrl` if provided
 *   2. `process.env.EVENT_STORE_URL`
 *   3. `process.env.EVENTSTORE_URL`
 *   4. `process.env.EVENT_DB_URL`
 *
 * If none are set, `boot` throws with a message naming every accepted env
 * var — same contract as `eventSourcingFeatures.initEventSourcing`.
 *
 * The `@arki/dot` package is an OPTIONAL peer of `@arki/event-sourcing`.
 * Importing this adapter without `@arki/dot` installed will fail at module
 * load — that is intentional: the adapter only makes sense in a DOT app.
 */
import type { EventStore, MessageBus } from '@event-driven-io/emmett';
import type { DotPip } from '@arki/dot/pip';
import type { CommandHandlerRegistration } from './command.js';
import type { PostgreSQLProjectionInput } from './event-sourcing-features.js';
/**
 * Options for the event-sourcing DOT adapter.
 */
export type EventSourcingDotOptions = {
    /**
     * PostgreSQL projection definitions registered inline on the event store.
     * Accepts the three projection builder patterns documented on
     * {@link PostgreSQLProjectionInput}.
     */
    readonly projections: readonly PostgreSQLProjectionInput[];
    /**
     * Command handlers wired into the in-memory message bus. Each handler's
     * `getStreamName` callback maps an incoming command to its target stream.
     *
     * Defaults to `[]` — useful when an app only does projections / event
     * appends without command-side dispatch.
     */
    readonly commandHandlers?: readonly CommandHandlerRegistration[];
    /**
     * Connection URL for the event store. When omitted, the pip reads
     * `EVENT_STORE_URL`, `EVENTSTORE_URL`, or `EVENT_DB_URL` from
     * `process.env`. If none are set, `boot` throws.
     */
    readonly dbUrl?: string;
    /**
     * Pip name override. Defaults to `'event-sourcing'`. Use this only
     * when composing multiple event-sourcing scopes inside the same app.
     */
    readonly name?: string;
};
/** Services published by the event-sourcing adapter. */
export type EventSourcingServices = {
    /** The Emmett event store handle, ready to load/append streams. */
    readonly eventStore: EventStore;
    /**
     * The in-memory message bus. Already has the configured command handlers
     * attached — call `messageBus.send(command)` to dispatch.
     */
    readonly messageBus: MessageBus;
};
/**
 * Build a DOT pip that opens the event store, wires command handlers
 * into an in-memory message bus, and publishes both as services. The
 * kernel calls `dispose` in reverse-topological order to release the
 * underlying PG pool.
 */
export declare function eventSourcing(options: EventSourcingDotOptions): DotPip<EventSourcingServices>;
//# sourceMappingURL=dot.d.ts.map