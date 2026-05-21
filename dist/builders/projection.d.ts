import type { z } from '@arki/contracts';
import type { AnyEvent } from '../event.js';
/**
 * Type definition for CanHandle predicate
 * Used to filter events that a projection can handle
 */
type CanHandle<EventType extends AnyEvent> = EventType['type'][];
/**
 * Fluent builder for read-model projections.
 *
 * Projections consume event streams and populate query-side views. This builder captures
 * the essentials—projection name, handled event types, validated context—and terminates
 * in a `.handler(...)` call that returns the shape required by Emmett’s projection
 * registration utilities.
 *
 * @example
 * ```ts
 * const userProjection = defineProjection<UserEvent>()
 *   .name('user-projection')
 *   .eventTypes(['UserCreated', 'UserUpdated'])
 *   .contextSchema(z.object({ repo: z.any() }))
 *   .handler(async (events, context) => {
 *     for (const event of events) {
 *       if (event.type === 'UserCreated') {
 *         await context.repo.users.create(event.data);
 *       }
 *     }
 *   });
 * ```
 */
declare class ProjectionBuilder<EventType extends AnyEvent = never, Context = never> {
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
     * Sets the projection name
     * @param name - Unique identifier for the projection
     * @returns A new ProjectionBuilder instance with the name set
     */
    name(name: string): ProjectionBuilder<EventType, Context>;
    /**
     * Sets the event types this projection can handle
     * @param types - Array of event type strings
     * @returns A new ProjectionBuilder instance with the event types set
     */
    eventTypes(types: EventType['type'][]): ProjectionBuilder<EventType, Context>;
    /**
     * Sets the context schema for validation
     * @param schema - Zod schema for validating the context
     * @returns A new ProjectionBuilder instance with the context schema set
     */
    contextSchema<TNewContext>(schema: z.ZodType<TNewContext>): ProjectionBuilder<EventType, TNewContext>;
    /**
     * Terminal method that creates the projection
     *
     * Validates that all required properties are set and returns an object
     * with three properties:
     * - name: The projection name
     * - canHandle: Array of event types to filter events
     * - handle: Function that validates context and processes events
     *
     * @param fn - Function that processes events and updates read models
     * @returns An object containing the projection configuration
     * @throws Error if name, eventTypes, or contextSchema are not defined
     */
    handler(fn: (events: EventType[], context: Context) => Promise<void>): {
        name: string;
        canHandle: CanHandle<EventType>;
        handle: (events: EventType[], context: unknown) => Promise<void>;
    };
}
/**
 * Factory function to create a new ProjectionBuilder
 *
 * @example
 * ```typescript
 * const builder = defineProjection<MyEvent>()
 *   .name('my-projection')
 *   .eventTypes(['EventTypeA', 'EventTypeB'])
 *   .contextSchema(myContextSchema)
 *   .handler(async (events, context) => { ... });
 * ```
 */
export declare function defineProjection<EventType extends AnyEvent = never>(): ProjectionBuilder<EventType, never>;
export {};
//# sourceMappingURL=projection.d.ts.map