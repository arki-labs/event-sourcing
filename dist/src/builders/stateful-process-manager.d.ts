import type { z } from '@arki/contracts';
import type { Event } from '../event';
/**
 * Type definition for CanHandle predicate
 * Used to filter events that a stateful process manager can handle
 */
type CanHandle<EventType extends Event> = EventType['type'][];
/**
 * StatefulProcessManagerBuilder - Fluent API for building type-safe stateful process managers (sagas)
 *
 * Provides an immutable builder pattern for creating stateful process managers with:
 * - Type safety through TypeScript generics
 * - Runtime validation through Zod schemas
 * - ORPC-style API with .handler() as terminal method
 * - Persistent state management with load/save operations
 *
 * A Stateful Process Manager (Saga) maintains state across events to coordinate complex,
 * long-running business processes by:
 * - name: Unique identifier for the stateful process manager
 * - eventTypes: Array of event types this process manager handles
 * - stateSchema: Schema for validating process manager state
 * - contextSchema: Schema for validating execution context
 * - getStateId: Function to extract state identifier from events
 * - loadState: Function to load existing state from storage
 * - saveState: Function to persist state to storage
 * - handler: Function that processes individual events and returns updated state
 *
 * @example
 * ```typescript
 * type OrderState = {
 *   orderId: string;
 *   status: 'pending' | 'paid' | 'shipped' | 'completed';
 *   paymentId?: string;
 *   trackingId?: string;
 * };
 *
 * const orderProcessManager = defineStatefulProcessManager<OrderEvent, OrderState>()
 *   .name('order-fulfillment')
 *   .eventTypes(['OrderPlaced', 'PaymentProcessed', 'OrderShipped'])
 *   .stateSchema(z.object({
 *     orderId: z.string(),
 *     status: z.enum(['pending', 'paid', 'shipped', 'completed']),
 *     paymentId: z.string().optional(),
 *     trackingId: z.string().optional(),
 *   }))
 *   .contextSchema(z.object({ messageBus: z.any(), repo: z.any() }))
 *   .getStateId(event => `order-${event.data.orderId}`)
 *   .loadState(async (stateId, context) => {
 *     return await context.repo.orderSagas.findById(stateId);
 *   })
 *   .saveState(async (stateId, state, context) => {
 *     await context.repo.orderSagas.upsert({ id: stateId, ...state });
 *   })
 *   .handler(async (event, state, context) => {
 *     if (event.type === 'OrderPlaced') {
 *       // Initialize state for new order
 *       return {
 *         orderId: event.data.orderId,
 *         status: 'pending',
 *       };
 *     } else if (event.type === 'PaymentProcessed') {
 *       // Update state after payment
 *       return {
 *         ...state!,
 *         status: 'paid',
 *         paymentId: event.data.paymentId,
 *       };
 *     } else if (event.type === 'OrderShipped') {
 *       // Update state after shipping
 *       return {
 *         ...state!,
 *         status: 'shipped',
 *         trackingId: event.data.trackingId,
 *       };
 *     }
 *     return state!;
 *   });
 * ```
 */
declare class StatefulProcessManagerBuilder<EventType extends Event = never, State = never, Context = never> {
    private _name?;
    private _eventTypes?;
    private _stateSchema?;
    private _contextSchema?;
    private _getStateIdFn?;
    private _loadStateFn?;
    private _saveStateFn?;
    private _handlerFn?;
    /**
     * Creates a deep copy of the builder to ensure immutability
     * @private
     */
    private clone;
    /**
     * Sets the stateful process manager name
     * @param name - Unique identifier for the stateful process manager
     * @returns A new StatefulProcessManagerBuilder instance with the name set
     */
    name(name: string): StatefulProcessManagerBuilder<EventType, State, Context>;
    /**
     * Sets the event types this stateful process manager can handle
     * @param types - Array of event type strings
     * @returns A new StatefulProcessManagerBuilder instance with the event types set
     */
    eventTypes(types: EventType['type'][]): StatefulProcessManagerBuilder<EventType, State, Context>;
    /**
     * Sets the state schema for validation
     * @param schema - Zod schema for validating the stateful process manager state
     * @returns A new StatefulProcessManagerBuilder instance with the state schema set
     */
    stateSchema<TNewState>(schema: z.ZodType<TNewState>): StatefulProcessManagerBuilder<EventType, TNewState, Context>;
    /**
     * Sets the context schema for validation
     * @param schema - Zod schema for validating the execution context
     * @returns A new StatefulProcessManagerBuilder instance with the context schema set
     */
    contextSchema<TNewContext>(schema: z.ZodType<TNewContext>): StatefulProcessManagerBuilder<EventType, State, TNewContext>;
    /**
     * Sets the function to extract state identifier from events
     * @param fn - Function that extracts a unique state identifier from an event
     * @returns A new StatefulProcessManagerBuilder instance with the getStateId function set
     */
    getStateId(fn: (event: EventType) => string): StatefulProcessManagerBuilder<EventType, State, Context>;
    /**
     * Sets the function to load existing state from storage
     * @param fn - Function that loads state by identifier, returns null if state doesn't exist
     * @returns A new StatefulProcessManagerBuilder instance with the loadState function set
     */
    loadState(fn: (stateId: string, context: Context) => Promise<State | null>): StatefulProcessManagerBuilder<EventType, State, Context>;
    /**
     * Sets the function to persist state to storage
     * @param fn - Function that saves state by identifier
     * @returns A new StatefulProcessManagerBuilder instance with the saveState function set
     */
    saveState(fn: (stateId: string, state: State, context: Context) => Promise<void>): StatefulProcessManagerBuilder<EventType, State, Context>;
    /**
     * Terminal method that creates the stateful process manager
     *
     * Validates that all required configuration is set and returns an object
     * with three properties:
     * - processorId: The stateful process manager identifier
     * - canHandle: Array of event types to filter events
     * - eachBatch: Function that validates context, loads state for each event,
     *              processes it through the handler, and saves the updated state
     *
     * @param fn - Function that processes individual events with their state and returns updated state
     * @returns An object containing the stateful process manager configuration
     * @throws Error if name, eventTypes, stateSchema, contextSchema, getStateId, loadState, or saveState are not defined
     */
    handler(fn: (event: EventType, state: State | null, context: Context) => Promise<State>): {
        processorId: string;
        canHandle: CanHandle<EventType>;
        eachBatch: (events: EventType[], context: unknown) => Promise<void>;
    };
}
/**
 * Factory function to create a new StatefulProcessManagerBuilder
 *
 * @example
 * ```typescript
 * const builder = defineStatefulProcessManager<MyEvent, MyState>()
 *   .name('my-stateful-process-manager')
 *   .eventTypes(['EventTypeA', 'EventTypeB'])
 *   .stateSchema(myStateSchema)
 *   .contextSchema(myContextSchema)
 *   .getStateId(event => `state-${event.data.id}`)
 *   .loadState(async (stateId, context) => {
 *     return await context.repo.findById(stateId);
 *   })
 *   .saveState(async (stateId, state, context) => {
 *     await context.repo.upsert({ id: stateId, ...state });
 *   })
 *   .handler(async (event, state, context) => {
 *     // Process event and return updated state
 *     return { ...state, updated: true };
 *   });
 * ```
 */
export declare function defineStatefulProcessManager<EventType extends Event = never, State = never>(): StatefulProcessManagerBuilder<EventType, State, never>;
export {};
//# sourceMappingURL=stateful-process-manager.d.ts.map