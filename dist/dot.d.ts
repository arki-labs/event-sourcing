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
import type { Command, Event, EventStore, MessageBus } from '@event-driven-io/emmett';
import type { Plugin, Token } from '@arki/dot/plugin';
import type { CommandHandlerRegistration } from './command.js';
import type { PostgreSQLProjectionInput } from './event-sourcing-features.js';
import type { CommandHandler } from './builders/command-handler.js';
/**
 * Stable error codes thrown by the event-sourcing plugin. Exported so consumers
 * and coding agents can match against them — never parse the message.
 *
 * @see packages/dot/docs/principles.md — principle 1.3 ("errors are part
 * of the API") and principle 4 ("agent-discoverable everywhere").
 */
export declare const EVENT_SOURCING_PLUGIN_ERROR_CODES: {
    /** boot was called without a configured event-store URL. */
    readonly dbUrlNotConfigured: "EVENT_SOURCING_PLUGIN_E001";
    /** two collected handlers claim the same command type. */
    readonly duplicateCommandHandler: "EVENT_SOURCING_PLUGIN_E002";
    /** a bundle token listed in options.bundles was not provided. */
    readonly bundleMissing: "EVENT_SOURCING_PLUGIN_E003";
    /** a command was dispatched with no registered handler. */
    readonly commandHandlerMissing: "EVENT_SOURCING_PLUGIN_E004";
    /** a command was dispatched after the dispatcher closed. */
    readonly dispatcherClosed: "EVENT_SOURCING_PLUGIN_E005";
    /** reserved for a future declared-action/handler parity diagnostic. */
    readonly declaredActionUnbound: "EVENT_SOURCING_PLUGIN_E006";
    /** command/event schema could not be converted to JSON Schema. */
    readonly schemaRejected: "EVENT_SOURCING_PLUGIN_E007";
};
/** A token publishing an {@link EsBundle} — what `options.bundles` lists. */
export type BundleToken = Token<EsBundle, string>;
/** Wire-needs record derived from bundle tokens. */
export type BundleNeeds<TBundles extends readonly BundleToken[]> = {
    readonly [Tok in TBundles[number] as Tok extends Token<EsBundle, infer K> ? K : never]: EsBundle;
};
/**
 * A feature token whose slice MAY carry an ES bundle under the `es` key —
 * what `options.features` lists (the feature-plugins slice protocol).
 * Features without an `es` slice contribute nothing, by design.
 */
export type EsFeatureToken = Token<{
    readonly es?: EsBundle;
}, string>;
/** Wire-needs record derived from feature tokens. */
export type EsFeatureNeeds<TFeatures extends readonly EsFeatureToken[]> = {
    readonly [Tok in TFeatures[number] as Tok extends Token<unknown, infer K> ? K : never]: {
        readonly es?: EsBundle;
    };
};
type CommandFactory<C extends Command = Command> = {
    readonly type: C['type'];
} & ((input: never, metadata?: never) => C);
/** Feature-local event-sourcing registrations collected by `eventSourcing()`. */
export type EsBundle = {
    /** Command handlers attached to the in-process message bus at boot. */
    readonly handlers: readonly CommandHandlerRegistration[];
    /** Inline PostgreSQL read-model projections registered on the event store. */
    readonly readModels: readonly PostgreSQLProjectionInput[];
};
export type EsBundleInput = {
    readonly handlers?: readonly CommandHandlerRegistration[];
    readonly readModels?: readonly PostgreSQLProjectionInput[];
};
declare function bundle(input?: EsBundleInput): EsBundle;
declare function handle<C extends Command, State, StreamEvent extends Event>(command: CommandFactory<C>, handler: CommandHandler<State, C, StreamEvent>, getStreamName: (command: C) => string): CommandHandlerRegistration<C, State, StreamEvent>;
/** Namespace for feature-local ES bundle helpers. */
export declare const es: {
    bundle: typeof bundle;
    handle: typeof handle;
};
/**
 * Options for the event-sourcing DOT adapter.
 */
export type EventSourcingDotOptions<TBundles extends readonly BundleToken[] = readonly BundleToken[], TFeatures extends readonly EsFeatureToken[] = readonly EsFeatureToken[]> = {
    /**
     * PostgreSQL projection definitions registered inline on the event store.
     * Accepts the three projection builder patterns documented on
     * {@link PostgreSQLProjectionInput}.
     */
    readonly projections?: readonly PostgreSQLProjectionInput[];
    /**
     * Feature-local bundles to collect. Each token becomes a typed DOT need,
     * so the app builder rejects an `eventSourcing({ bundles })` collector
     * unless an earlier plugin publishes every listed bundle.
     */
    readonly bundles?: TBundles;
    /**
     * Feature-plugin slice tokens to collect (`{ es?: EsBundle }`). Each token
     * becomes a typed DOT need like `bundles`; a feature without an `es`
     * slice contributes nothing (partial features are zero-config — a
     * debug line records the empty contribution).
     */
    readonly features?: TFeatures;
    /**
     * Command handlers wired into the in-memory message bus. Each handler's
     * `getStreamName` callback maps an incoming command to its target stream.
     *
     * Defaults to `[]` — useful when an app only does projections / event
     * appends without command-side dispatch.
     */
    readonly commandHandlers?: readonly CommandHandlerRegistration[];
    /**
     * Connection URL for the event store. When omitted, the plugin reads
     * `EVENT_STORE_URL`, `EVENTSTORE_URL`, or `EVENT_DB_URL` from
     * `process.env`. If none are set, `boot` throws.
     */
    readonly dbUrl?: string;
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
 * Build a DOT plugin that opens the event store, wires command handlers
 * into an in-memory message bus, and publishes both as services. The
 * kernel calls `dispose` in reverse declaration order to release the
 * underlying PG pool.
 */
export declare function eventSourcing<const TBundles extends readonly BundleToken[] = readonly [], const TFeatures extends readonly EsFeatureToken[] = readonly []>(options?: EventSourcingDotOptions<TBundles, TFeatures>): Plugin<BundleNeeds<TBundles> & EsFeatureNeeds<TFeatures>, EventSourcingServices>;
export {};
//# sourceMappingURL=dot.d.ts.map