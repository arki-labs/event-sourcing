import { DeciderCommandHandler } from '@event-driven-io/emmett';
import { debugBuilder } from '../debug.js';
/**
 * Creates a store-connected command handler from a decider configuration.
 *
 * This is the recommended way to create command handlers. It wraps Emmett's
 * `DeciderCommandHandler` while lifting the `CommandType extends Command`
 * constraint that prevents commands with custom metadata from type-checking.
 *
 * Emmett's `Command` type uses a conditional type for metadata:
 * - When metadata is `undefined`, the `metadata` property is optional.
 * - When metadata is defined, it becomes required.
 *
 * TypeScript cannot prove that a concrete command (with custom metadata)
 * satisfies `extends Command` across these conditional branches. This wrapper
 * bridges that gap with a single, localised type assertion — keeping all
 * call sites fully type-safe.
 *
 * @example
 * ```typescript
 * const handler = defineCommandHandler({
 *   initialState,
 *   evolve,
 *   decide,
 * });
 *
 * export const bookCommandHandlers = BookCommands.map(commandType => ({
 *   commandType,
 *   handler,
 *   getStreamName,
 * }));
 * ```
 */
export function defineCommandHandler(config) {
    debugBuilder('[command-handler] Creating command handler');
    const emmettHandler = DeciderCommandHandler(config);
    debugBuilder('[command-handler] Command handler created successfully');
    return emmettHandler;
}
//# sourceMappingURL=command-handler.js.map