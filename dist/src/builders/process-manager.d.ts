import type { z } from '@arki/contracts';
import type { Event } from '../event';
/**
 * Type definition for CanHandle predicate
 * Used to filter events that a process manager can handle
 */
type CanHandle<EventType extends Event> = EventType['type'][];
/**
 * Fluent builder for Emmett process managers (sagas).
 *
 * Process managers sit outside an aggregate and react to streams of events in order to
 * coordinate long-running workflows. This builder helps you describe that behaviour with
 * explicit event filters, a validated execution context, and a terminal `.handler(...)`
 * that produces the configuration object Emmett expects.
 *
 * @example
 * ```ts
 * const orderSaga = defineProcessManager<OrderEvent>()
 *   .name('order-fulfillment')
 *   .eventTypes(['OrderPlaced', 'PaymentProcessed', 'OrderShipped'])
 *   .contextSchema(z.object({ messageBus: z.any(), repo: z.any() }))
 *   .handler(async (events, context) => {
 *     for (const event of events) {
 *       if (event.type === 'OrderPlaced') {
 *         await context.messageBus.send({ type: 'ProcessPayment', data: event.data });
 *       } else if (event.type === 'PaymentProcessed') {
 *         await context.messageBus.send({ type: 'ShipOrder', data: event.data });
 *       }
 *     }
 *   });
 * ```
 */
declare class ProcessManagerBuilder<EventType extends Event = never, Context = never> {
    private _name?;
    private _eventTypes?;
    private _contextSchema?;
    private _handlerFn?;
    /**
     * Creates a deep copy of the builder to ensure immutability
     * @private
     */
    private clone;
    /**
     * Sets the process manager name
     * @param name - Unique identifier for the process manager
     * @returns A new ProcessManagerBuilder instance with the name set
     */
    name(name: string): ProcessManagerBuilder<EventType, Context>;
    /**
     * Sets the event types this process manager can handle
     * @param types - Array of event type strings
     * @returns A new ProcessManagerBuilder instance with the event types set
     */
    eventTypes(types: EventType['type'][]): ProcessManagerBuilder<EventType, Context>;
    /**
     * Sets the context schema for validation
     * @param schema - Zod schema for validating the context
     * @returns A new ProcessManagerBuilder instance with the context schema set
     */
    contextSchema<TNewContext>(schema: z.ZodType<TNewContext>): ProcessManagerBuilder<EventType, TNewContext>;
    /**
     * Terminal method that creates the process manager
     *
     * Validates that all required properties are set and returns an object
     * with three properties:
     * - processorId: The process manager identifier
     * - canHandle: Array of event types to filter events
     * - eachBatch: Function that validates context and processes event batches
     *
     * @param fn - Function that processes event batches to coordinate workflows
     * @returns An object containing the process manager configuration
     * @throws Error if name, eventTypes, or contextSchema are not defined
     */
    handler(fn: (events: EventType[], context: Context) => Promise<void>): {
        processorId: string;
        canHandle: CanHandle<EventType>;
        eachBatch: (events: EventType[], context: unknown) => Promise<void>;
    };
}
/**
 * Factory function to create a new ProcessManagerBuilder
 *
 * @example
 * ```typescript
 * const builder = defineProcessManager<MyEvent>()
 *   .name('my-process-manager')
 *   .eventTypes(['EventTypeA', 'EventTypeB'])
 *   .contextSchema(myContextSchema)
 *   .handler(async (events, context) => { ... });
 * ```
 */
export declare function defineProcessManager<EventType extends Event = never>(): ProcessManagerBuilder<EventType, never>;
export {};
//# sourceMappingURL=process-manager.d.ts.map