import { debugBuilder } from '../debug.js';
import { defineCommandHandler } from './command-handler.js';
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
class DeciderBuilder {
    _stateSchema;
    _initialStateFn;
    _evolveFn;
    _decideFn;
    /**
     * Creates a deep copy of the builder to ensure immutability
     * @private
     */
    clone() {
        const builder = new DeciderBuilder();
        builder._stateSchema = this._stateSchema;
        builder._initialStateFn = this._initialStateFn;
        builder._evolveFn = this._evolveFn;
        builder._decideFn = this._decideFn;
        return builder;
    }
    /**
     * Sets the state schema for state validation
     * @param schema - Zod schema for validating state
     * @returns A new DeciderBuilder instance with the state schema set
     */
    stateSchema(schema) {
        const builder = new DeciderBuilder();
        builder._stateSchema = schema;
        builder._initialStateFn = this._initialStateFn;
        builder._evolveFn = this._evolveFn;
        builder._decideFn = this._decideFn;
        debugBuilder('[decider] Set state schema');
        return builder;
    }
    /**
     * Sets the initial state function
     * @param fn - Function that returns the initial state for a new aggregate
     * @returns A new DeciderBuilder instance with the initial state function set
     */
    initialState(fn) {
        const builder = this.clone();
        builder._initialStateFn = fn;
        debugBuilder('[decider] Set initial state function');
        return builder;
    }
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
    evolve(fn) {
        const builder = new DeciderBuilder();
        builder._stateSchema = this._stateSchema;
        builder._initialStateFn = this._initialStateFn;
        builder._evolveFn = fn;
        builder._decideFn = this._decideFn;
        debugBuilder('[decider] Set evolve function');
        return builder;
    }
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
    decide(fn) {
        const builder = new DeciderBuilder();
        builder._stateSchema = this._stateSchema;
        builder._initialStateFn = this._initialStateFn;
        builder._evolveFn = this._evolveFn;
        builder._decideFn = fn;
        debugBuilder('[decider] Set decide function');
        return builder;
    }
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
    handler() {
        if (!this._stateSchema || !this._initialStateFn || !this._evolveFn || !this._decideFn) {
            debugBuilder('[decider] ERROR: Missing required properties');
            throw new Error('Decider must have state schema, initial state function, evolve function, and decide function defined');
        }
        const stateSchema = this._stateSchema;
        const initialStateFn = this._initialStateFn;
        const evolveFn = this._evolveFn;
        const decideFn = this._decideFn;
        debugBuilder('[decider] Building decider handler');
        return {
            initialState: () => {
                debugBuilder('[decider] Getting initial state');
                const state = initialStateFn();
                return stateSchema.parse(state);
            },
            evolve: (state, event) => {
                debugBuilder('[decider] Evolving state with event: %s', event.type);
                const validatedState = stateSchema.parse(state);
                const nextState = evolveFn(validatedState, event);
                return stateSchema.parse(nextState);
            },
            decide: (command, state) => {
                debugBuilder('[decider] Deciding events for command: %s', command.type);
                const validatedState = stateSchema.parse(state);
                const events = decideFn(command, validatedState);
                debugBuilder('[decider] Generated %d event(s)', events.length);
                return events;
            },
        };
    }
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
    commandHandler() {
        if (!this._initialStateFn || !this._evolveFn || !this._decideFn) {
            debugBuilder('[decider] ERROR: Missing required properties for command handler');
            throw new Error('Decider must have initial state function, evolve function, and decide function defined to create a command handler');
        }
        debugBuilder('[decider] Building store-connected command handler');
        return defineCommandHandler({
            initialState: this._initialStateFn,
            evolve: this._evolveFn,
            decide: this._decideFn,
        });
    }
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
export function defineDecider() {
    debugBuilder('[decider] Creating new decider builder');
    return new DeciderBuilder();
}
//# sourceMappingURL=decider.js.map