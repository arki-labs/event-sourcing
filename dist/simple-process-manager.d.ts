import type { Event } from '@event-driven-io/emmett';
/**
 * Creates a simple process manager that reacts to events one at a time,
 * with a pre-bound context closed over at construction time.
 *
 * This is a thin wrapper around Emmett's `reactor` that exposes a positional
 * API with per-message processing semantics. It is intended for the most
 * common process manager use case where:
 *
 * - The context (repositories, KV, message bus, etc.) is fixed at construction time.
 * - The handler operates on one event at a time rather than a batch.
 * - Errors propagate to the consumer so the underlying subscription can
 *   apply retry/back-off policies.
 *
 * For richer use cases (per-batch processing, lifecycle hooks, stateful
 * sagas, idempotency) prefer {@link createProcessManager} or
 * {@link createStatefulProcessManager} from this package.
 *
 * @example
 * ```ts
 * const trackingNotifications = createSimpleProcessManager(
 *   { repo, kv },
 *   'tracking-notifications',
 *   ['MovieWatchLogged', 'TvShowRated'],
 *   async (event, context) => {
 *     // ... handle one event using context
 *   },
 * );
 * ```
 *
 * @param context Fixed context closed over by the process manager handler.
 * @param name Unique identifier for the process manager (used as processor id).
 * @param eventTypes Event types this process manager reacts to.
 * @param handlerFn Async function invoked once per matching event.
 */
export declare function createSimpleProcessManager<TEvent extends Event, TContext extends object>(context: TContext, name: string, eventTypes: TEvent['type'][], handlerFn: (event: TEvent, context: TContext) => Promise<void>): import("@event-driven-io/emmett").MessageProcessor<TEvent, import("@event-driven-io/emmett").AnyRecordedMessageMetadata, import("@event-driven-io/emmett").DefaultRecord, any>;
//# sourceMappingURL=simple-process-manager.d.ts.map