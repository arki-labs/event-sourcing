/**
 * DOT adapter for `@arki/event-sourcing`.
 *
 * Wraps `eventSourcingFeatures.initEventSourcing` + `initMessageBus` as a
 * single `DotPlugin`. The plugin opens the PostgreSQL event store in
 * `boot`, attaches command handlers to an in-memory message bus, publishes
 * both as `services.eventStore` and `services.messageBus`, and closes the
 * event store pool in `dispose` (reverse declaration order).
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
import { plugin, DotPluginError } from '@arki/dot/plugin';
import { debugBuilder } from './debug.js';
import { EVENT_STORE_URL_VARIANTS, eventSourcingFeatures } from './event-sourcing-features.js';
/**
 * Stable error codes thrown by the event-sourcing plugin. Exported so consumers
 * and coding agents can match against them — never parse the message.
 *
 * @see packages/dot/docs/principles.md — principle 1.3 ("errors are part
 * of the API") and principle 4 ("agent-discoverable everywhere").
 */
export const EVENT_SOURCING_PLUGIN_ERROR_CODES = {
    /** boot was called without a configured event-store URL. */
    dbUrlNotConfigured: 'EVENT_SOURCING_PLUGIN_E001',
    /** two collected handlers claim the same command type. */
    duplicateCommandHandler: 'EVENT_SOURCING_PLUGIN_E002',
    /** a bundle token listed in options.bundles was not provided. */
    bundleMissing: 'EVENT_SOURCING_PLUGIN_E003',
    /** a command was dispatched with no registered handler. */
    commandHandlerMissing: 'EVENT_SOURCING_PLUGIN_E004',
    /** a command was dispatched after the dispatcher closed. */
    dispatcherClosed: 'EVENT_SOURCING_PLUGIN_E005',
    /** reserved for a future declared-action/handler parity diagnostic. */
    declaredActionUnbound: 'EVENT_SOURCING_PLUGIN_E006',
    /** command/event schema could not be converted to JSON Schema. */
    schemaRejected: 'EVENT_SOURCING_PLUGIN_E007',
};
const EVENT_SOURCING_PLUGIN_VERSION = '0.2.0';
function bundle(input = {}) {
    return {
        handlers: input.handlers ?? [],
        readModels: input.readModels ?? [],
    };
}
function handle(command, handler, getStreamName) {
    return {
        commandType: command.type,
        handler,
        getStreamName,
    };
}
/** Namespace for feature-local ES bundle helpers. */
export const es = {
    bundle,
    handle,
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
function dotPluginError(args) {
    return new DotPluginError({
        code: args.code,
        message: args.message,
        remediation: args.remediation,
        docsUrl: `https://arki.dev/event-sourcing/errors/${args.docsSlug}`,
    });
}
function assertUniqueCommandHandlers(commandHandlers) {
    const seen = new Map();
    for (const registration of commandHandlers) {
        const count = seen.get(registration.commandType) ?? 0;
        seen.set(registration.commandType, count + 1);
    }
    const duplicate = [...seen.entries()].find(([, count]) => count > 1)?.[0];
    if (duplicate === undefined)
        return;
    throw dotPluginError({
        code: EVENT_SOURCING_PLUGIN_ERROR_CODES.duplicateCommandHandler,
        message: `[event-sourcing] command handler "${duplicate}" is registered more than once.`,
        remediation: 'Each command type may have exactly one handler across options.bundles and dynamic commandHandlers. Remove one registration or rename the command type.',
        docsSlug: 'event-sourcing-plugin-e002',
    });
}
function controlledMessageBus(inner, commandTypes) {
    let closed = false;
    let inflight = 0;
    const waiters = [];
    const finishOne = () => {
        inflight -= 1;
        if (inflight !== 0)
            return;
        const drained = waiters.splice(0);
        for (const waiter of drained)
            waiter();
    };
    return {
        async send(command) {
            if (closed) {
                throw dotPluginError({
                    code: EVENT_SOURCING_PLUGIN_ERROR_CODES.dispatcherClosed,
                    message: `[event-sourcing] command "${command.type}" was dispatched after the message bus closed.`,
                    remediation: 'Do not send commands after app.stop() begins. Stop ingress before closing event-sourcing consumers.',
                    docsSlug: 'event-sourcing-plugin-e005',
                });
            }
            if (!commandTypes.has(command.type)) {
                throw dotPluginError({
                    code: EVENT_SOURCING_PLUGIN_ERROR_CODES.commandHandlerMissing,
                    message: `[event-sourcing] no command handler is registered for "${command.type}".`,
                    remediation: 'Declare a feature ES bundle with es.handle(...), publish it before eventSourcing(...), and list its token in options.bundles.',
                    docsSlug: 'event-sourcing-plugin-e004',
                });
            }
            inflight += 1;
            try {
                await inner.send(command);
            }
            finally {
                finishOne();
            }
        },
        publish: event => inner.publish(event),
        schedule: (message, when) => {
            inner.schedule(message, when);
        },
        close() {
            closed = true;
            if (inflight === 0)
                return Promise.resolve();
            return new Promise(resolve => {
                waiters.push(resolve);
            });
        },
    };
}
/**
 * Build a DOT plugin that opens the event store, wires command handlers
 * into an in-memory message bus, and publishes both as services. The
 * kernel calls `dispose` in reverse declaration order to release the
 * underlying PG pool.
 */
export function eventSourcing(options = {}) {
    const bundleTokens = options.bundles ?? [];
    const featureTokens = options.features ?? [];
    const needs = {};
    for (const tok of [...bundleTokens, ...featureTokens]) {
        if (needs[tok.key] !== undefined) {
            throw dotPluginError({
                code: EVENT_SOURCING_PLUGIN_ERROR_CODES.duplicateCommandHandler,
                message: `[event-sourcing] token "${tok.key}" is listed twice across options.bundles/options.features.`,
                remediation: 'List each ES bundle or feature token once.',
                docsSlug: 'event-sourcing-plugin-e002',
            });
        }
        needs[tok.key] = tok;
    }
    // Captured at boot so dispose can call it without re-reading services
    // (dispose is allowed to run even when services failed to publish).
    let closeStore;
    let closeBus;
    const inner = plugin({
        name: 'event-sourcing',
        version: EVENT_SOURCING_PLUGIN_VERSION,
        needs,
        configure(ctx) {
            ctx.registerService('eventStore', 'event-store');
            ctx.registerService('messageBus', 'message-bus');
            ctx.registerProjection({
                format: 'event-catalog',
                binding: 'es',
                module: '@arki/event-sourcing/projection',
            });
            ctx.declareProvides('event-store', 'message-bus');
        },
        boot(ctx) {
            // Validate at the plugin boundary so the DOT lifecycle gets a coded
            // error. `eventSourcingFeatures.initEventSourcing` still throws raw
            // `Error` for non-DOT consumers (its public contract is unchanged);
            // the check here makes sure we never reach it without a URL.
            const dbUrl = resolveDbUrl(options.dbUrl);
            if (dbUrl === undefined) {
                throw new DotPluginError({
                    code: EVENT_SOURCING_PLUGIN_ERROR_CODES.dbUrlNotConfigured,
                    message: '[event-sourcing] Event Store database URL is not configured.',
                    remediation: `Pass options.dbUrl to eventSourcing(...) or set one of ${EVENT_STORE_URL_VARIANTS.join(', ')} in the environment before booting the app.`,
                    docsUrl: 'https://arki.dev/dot/errors/event-sourcing-plugin-e001',
                });
            }
            const record = ctx;
            const bundles = [];
            for (const tok of bundleTokens) {
                const collected = record[tok.key];
                if (collected === undefined) {
                    throw dotPluginError({
                        code: EVENT_SOURCING_PLUGIN_ERROR_CODES.bundleMissing,
                        message: `[event-sourcing] bundle "${tok.key}" was not provided by any earlier plugin.`,
                        remediation: 'Mount the plugin that publishes this ES bundle before eventSourcing(...). The typed builder enforces this; erased composition reaches this check.',
                        docsSlug: 'event-sourcing-plugin-e003',
                    });
                }
                bundles.push(collected);
            }
            const featureRecord = ctx;
            for (const tok of featureTokens) {
                const slice = featureRecord[tok.key];
                if (slice === undefined) {
                    throw dotPluginError({
                        code: EVENT_SOURCING_PLUGIN_ERROR_CODES.bundleMissing,
                        message: `[event-sourcing] feature "${tok.key}" was not provided by any earlier plugin.`,
                        remediation: 'Mount the feature plugin that provides this token before eventSourcing(...). The typed builder enforces this; erased composition reaches this check.',
                        docsSlug: 'event-sourcing-plugin-e003',
                    });
                }
                if (slice.es === undefined) {
                    debugBuilder('[event-sourcing] feature "%s" did not contribute an es slice.', tok.key);
                    continue;
                }
                bundles.push(slice.es);
            }
            const readModels = [
                ...(options.projections ?? []),
                ...bundles.flatMap(collected => collected.readModels),
            ];
            const commandHandlers = [
                ...bundles.flatMap(collected => collected.handlers),
                ...(options.commandHandlers ?? []),
            ];
            assertUniqueCommandHandlers(commandHandlers);
            const { eventStore, close } = eventSourcingFeatures.initEventSourcing(readModels, dbUrl);
            closeStore = close;
            const messageBus = controlledMessageBus(eventSourcingFeatures.initMessageBus(eventStore, [...commandHandlers]), new Set(commandHandlers.map(registration => registration.commandType)));
            closeBus = () => messageBus.close();
            return { eventStore, messageBus };
        },
        start() {
            // Marks the plugin active so DOT will run `stop`, where the dispatcher
            // closes before dispose releases the store pool.
        },
        async stop() {
            await closeBus?.();
        },
        async dispose() {
            await closeBus?.();
            closeBus = undefined;
            if (closeStore !== undefined) {
                await closeStore();
                closeStore = undefined;
            }
        },
    });
    // Erasure seam: `needs` is assembled from runtime tokens, while the
    // return type re-attaches the token-derived wire shape for the app
    // builder guard. Same pattern as @arki/http's bundle collector.
    return inner;
}
//# sourceMappingURL=dot.js.map