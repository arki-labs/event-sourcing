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
import { pip, DotPipError } from '@arki/dot/pip';
import { EVENT_STORE_URL_VARIANTS, eventSourcingFeatures } from './event-sourcing-features.js';
/**
 * Stable error codes thrown by the event-sourcing pip. Exported so consumers
 * and coding agents can match against them — never parse the message.
 *
 * @see packages/dot/docs/principles.md — principle 1.3 ("errors are part
 * of the API") and principle 4 ("agent-discoverable everywhere").
 */
export const EVENT_SOURCING_PIP_ERROR_CODES = {
    /** boot was called without a configured event-store URL. */
    dbUrlNotConfigured: 'EVENT_SOURCING_PIP_E001',
};
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
 * kernel calls `dispose` in reverse declaration order to release the
 * underlying PG pool.
 */
export function eventSourcing(options) {
    const commandHandlers = options.commandHandlers ?? [];
    // Captured at boot so dispose can call it without re-reading services
    // (dispose is allowed to run even when services failed to publish).
    let closeStore;
    return pip({
        name: 'event-sourcing',
        version: '0.1.0',
        configure(ctx) {
            ctx.registerService('eventStore', 'event-store');
            ctx.registerService('messageBus', 'message-bus');
            ctx.declareProvides('event-store', 'message-bus');
        },
        boot() {
            // Validate at the pip boundary so the DOT lifecycle gets a coded
            // error. `eventSourcingFeatures.initEventSourcing` still throws raw
            // `Error` for non-DOT consumers (its public contract is unchanged);
            // the check here makes sure we never reach it without a URL.
            const dbUrl = resolveDbUrl(options.dbUrl);
            if (dbUrl === undefined) {
                throw new DotPipError({
                    code: EVENT_SOURCING_PIP_ERROR_CODES.dbUrlNotConfigured,
                    message: '[event-sourcing] Event Store database URL is not configured.',
                    remediation: `Pass options.dbUrl to eventSourcing(...) or set one of ${EVENT_STORE_URL_VARIANTS.join(', ')} in the environment before booting the app.`,
                    docsUrl: 'https://arki.dev/dot/errors/event-sourcing-pip-e001',
                });
            }
            const { eventStore, close } = eventSourcingFeatures.initEventSourcing(options.projections, dbUrl);
            closeStore = close;
            const messageBus = eventSourcingFeatures.initMessageBus(eventStore, [...commandHandlers]);
            return { eventStore, messageBus };
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