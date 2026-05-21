/**
 * Event Sourcing Builders
 *
 * Fluent API builders for constructing event sourcing components with type safety.
 *
 * @example
 * ```typescript
 * import { defineEvent, defineDecider, defineProjection } from '@arki/event-sourcing/builders';
 *
 * // Define an event
 * const userCreated = defineEvent()
 *   .type('UserCreated')
 *   .data(z.object({ userId: z.string(), email: z.string() }))
 *   .metadata(z.object({ timestamp: z.string() }))
 *   .handler(({ data, metadata }) => ({ type: 'UserCreated', data, metadata }));
 *
 * // Define a decider
 * const userDecider = defineDecider()
 *   .stateSchema(userStateSchema)
 *   .initialState(() => ({ users: [] }))
 *   .evolve((state, event) => { ... })
 *   .decide((command, state) => { ... })
 *   .handler();
 *
 * // Define a projection
 * const userProjection = defineProjection()
 *   .name('user-projection')
 *   .eventTypes(['UserCreated', 'UserUpdated'])
 *   .contextSchema(z.object({ repo: z.any() }))
 *   .handler(async (events, context) => { ... });
 * ```
 */
export { defineCommand } from './command';
export { defineCommandHandler, type CommandHandler } from './command-handler';
export { defineEvent } from './event';
export { defineDecider } from './decider';
export { defineProjection } from './projection';
export { defineProcessManager } from './process-manager';
export { defineStatefulProcessManager } from './stateful-process-manager';
//# sourceMappingURL=index.d.ts.map