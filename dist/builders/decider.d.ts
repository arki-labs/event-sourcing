import type { Event as EmmettEvent } from '@event-driven-io/emmett';
import type { z } from '@arki/contracts';
import type { AnyEvent } from '../event.js';
import type { CommandHandler } from './command-handler.js';
/**
 * Applies a domain event to the current aggregate state and produces the next state.
 */
type Evolve<State, StreamEvent extends AnyEvent> = (state: State, event: StreamEvent) => State;
/**
 * Computes the domain events that should be emitted for an incoming command,
 * based on the aggregate's current state.
 */
type Decide<State, Command, StreamEvent extends AnyEvent> = (command: Command, state: State) => StreamEvent[];
/**
 * Fluent builder for aggregate behaviour (aka "decider") definitions.
 *
 * In many event-sourcing texts this role is called an *aggregate*: an object that owns
 * the authoritative state, knows how to rebuild itself from events (`evolve`), and
 * decides which new events should be recorded when commands arrive (`decide`).
 *
 * We keep the historical Emmett name `Decider` to match upstream types, but the builder
 * intentionally documents the aggregate semantics so domain code can align on that
 * mental model.
 *
 * Capabilities:
 * - Type safety through TypeScript generics
 * - Optional Zod schemas to validate state evolution at runtime
 * - Chainable configuration that terminates with `.handler()`, returning the executed aggregate contract
 *
 * @example
 * ```typescript
 * const cartAggregate = defineDecider()
 *   .stateSchema(z.object({ items: z.array(z.string()), total: z.number() }))
 *   .initialState(() => ({ items: [], total: 0 }))
 *   .evolve((state, event) => {
 *     if (event.type === 'ItemAdded') {
 *       return {
 *         items: [...state.items, event.data.item],
 *         total: state.total + event.data.price,
 *       };
 *     }
 *     return state;
 *   })
 *   .decide((command, state) => {
 *     if (command.type === 'AddItem') {
 *       return [
 *         {
 *           type: 'ItemAdded',
 *           data: { item: command.data.item, price: command.data.price },
 *         },
 *       ];
 *     }
 *     return [];
 *   })
 *   .handler();
 *
 * const initial = cartAggregate.initialState();
 * const events = cartAggregate.decide(addItemCommand, initial);
 * const next = cartAggregate.evolve(initial, events[0]);
 * ```
 */
declare class DeciderBuilder<State = never, Command = never, StreamEvent extends AnyEvent = never> {
    private _stateSchema?;
    private _initialStateFn?;
    private _evolveFn?;
    private _decideFn?;
    /**
     * Creates a deep copy of the builder to ensure immutability
     * @private
     */
    private clone;
    /**
     * Sets the state schema for state validation
     * @param schema - Zod schema for validating state
     * @returns A new DeciderBuilder instance with the state schema set
     */
    stateSchema<TNewState>(schema: z.ZodType<TNewState>): DeciderBuilder<TNewState, Command, StreamEvent>;
    /**
     * Sets the initial state function
     * @param fn - Function that returns the initial state for a new aggregate
     * @returns A new DeciderBuilder instance with the initial state function set
     */
    initialState(fn: () => State): DeciderBuilder<State, Command, StreamEvent>;
    /**
     * Sets the evolve function
     *
     * This method is generic and will infer the StreamEvent type from the function parameter,
     * allowing TypeScript to properly infer complex discriminated union types.
     *
     * @template TStreamEvent - The union type of all events (inferred from fn parameter)
     * @param fn - Function that applies an event to state to compute the next state
     * @returns A new DeciderBuilder instance with the evolve function and inferred event types set
     */
    evolve<TStreamEvent extends AnyEvent>(fn: Evolve<State, TStreamEvent>): DeciderBuilder<State, Command, TStreamEvent>;
    /**
     * Sets the decide function
     *
     * This method is generic and will infer the Command type from the function parameter,
     * allowing TypeScript to properly infer complex discriminated union types.
     *
     * @template TCommand - The union type of all commands (inferred from fn parameter)
     * @param fn - Function that determines which events to emit for a given command and state
     * @returns A new DeciderBuilder instance with the decide function and inferred command types set
     */
    decide<TCommand>(fn: Decide<State, TCommand, StreamEvent>): DeciderBuilder<State, TCommand, StreamEvent>;
    /**
     * Terminal method that creates the decider
     *
     * Validates that all required functions are set and returns an object
     * with three validated functions:
     * - initialState: Returns the validated initial state
     * - evolve: Applies an event to state with validation
     * - decide: Determines events to emit with validation
     *
     * @returns An object containing the three core decider functions
     * @throws Error if state schema, initial state function, evolve function, or decide function are not defined
     */
    handler(): {
        initialState: () => State;
        evolve: Evolve<State, StreamEvent>;
        decide: Decide<State, Command, StreamEvent>;
    };
    /**
     * Terminal method that creates a store-connected command handler.
     *
     * Unlike `.handler()`, this does **not** require a state schema — it creates
     * a handler that can be registered directly with an event store. Internally
     * it delegates to `defineCommandHandler`, which bridges the Emmett type
     * constraint on command metadata.
     *
     * Use this when you need a handler that reads/writes events from a store
     * (the common case for aggregates), rather than the raw decider functions.
     *
     * @returns A store-connected command handler function
     * @throws Error if initial state, evolve, or decide functions are not defined
     *
     * @example
     * ```typescript
     * const handler = defineDecider()
     *   .initialState(() => null as BookState)
     *   .evolve(evolve)
     *   .decide(decide)
     *   .commandHandler();
     * ```
     */
    commandHandler(): StreamEvent extends EmmettEvent ? CommandHandler<State, Command, StreamEvent> : never;
}
/**
 * Factory function to create a new DeciderBuilder
 *
 * **Recommended API**: This builder API supports complex discriminated unions
 * through parameter-based type inference. The `.evolve()` and `.decide()` methods
 * are generic and will automatically infer types from your function parameters.
 *
 * **Use cases:**
 * - ✅ All cases (simple and complex)
 * - ✅ Complex discriminated unions (10+ command/event types)
 * - ✅ Fluent, chainable API preference
 * - ✅ Automatic type inference from function parameters
 *
 * @example
 * ```typescript
 * // Works for both simple and complex union types
 * const decider = defineDecider()
 *   .stateSchema(myStateSchema)
 *   .initialState(() => ({ ... }))
 *   .evolve((state, event) => {
 *     // TypeScript infers event type from this function
 *     switch (event.type) {
 *       case 'EventA': return { ... };
 *       case 'EventB': return { ... };
 *       // ... handles 10+ event types correctly
 *     }
 *   })
 *   .decide((command, state) => {
 *     // TypeScript infers command type from this function
 *     switch (command.type) {
 *       case 'CommandA': return [{ type: 'EventA', ... }];
 *       case 'CommandB': return [{ type: 'EventB', ... }];
 *       // ... handles 10+ command types correctly
 *     }
 *   })
 *   .handler();
 * ```
 */
export declare function defineDecider(): DeciderBuilder;
export {};
//# sourceMappingURL=decider.d.ts.map