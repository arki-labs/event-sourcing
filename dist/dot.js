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
import { defineDotPip } from '@arki/dot/pip';
import { EVENT_STORE_URL_VARIANTS, eventSourcingFeatures } from './event-sourcing-features.js';
/**
 * Resolve the event-store connection URL from explicit options first, then
 * from the recognised env vars in priority order. Returns `undefined` when
 * none are set so the underlying factory can throw the canonical error.
 */
function resolveDbUrl(explicit) {
    if (explicit !== undefined && explicit !== '')
        return explicit;
    for (const name of EVENT_STORE_URL_VARIANTS) {
        const value = process.env[name];
        if (value !== undefined && value !== '')
            return value;
    }
    return undefined;
}
/**
 * Build a DOT pip that opens the event store, wires command handlers
 * into an in-memory message bus, and publishes both as services. The
 * kernel calls `dispose` in reverse-topological order to release the
 * underlying PG pool.
 */
export function eventSourcing(options) {
    const name = options.name ?? 'event-sourcing';
    const commandHandlers = options.commandHandlers ?? [];
    // Captured at boot so dispose can call it without re-reading services
    // (dispose is allowed to run even when services failed to publish).
    let closeStore;
    return defineDotPip({
        name,
        version: '0.1.0',
        provides: ['event-store', 'message-bus'],
        configure(ctx) {
            ctx.registerService('eventStore', 'event-store');
            ctx.registerService('messageBus', 'message-bus');
        },
        boot() {
            const dbUrl = resolveDbUrl(options.dbUrl);
            const { eventStore, close } = eventSourcingFeatures.initEventSourcing(options.projections, dbUrl);
            closeStore = close;
            const messageBus = eventSourcingFeatures.initMessageBus(eventStore, [...commandHandlers]);
            return { services: { eventStore, messageBus } };
        },
        async dispose() {
            if (closeStore !== undefined) {
                await closeStore();
                closeStore = undefined;
            }
        },
    });
}
//# sourceMappingURL=dot.js.map