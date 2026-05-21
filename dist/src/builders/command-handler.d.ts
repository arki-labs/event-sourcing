import type { CommandHandlerResult, Event, EventStore, HandleOptions } from '@event-driven-io/emmett';
type DeciderConfig<State, CommandType, StreamEvent> = {
    initialState: () => State;
    evolve: (state: State, event: StreamEvent) => State;
    decide: (command: CommandType, state: State) => StreamEvent | StreamEvent[];
};
/**
 * Store-connected command handler function type.
 *
 * Given an event store, stream id, and one or more commands, it loads the
 * current aggregate state from the stream, applies the decider's `decide`
 * function, and appends the resulting events.
 */
export type CommandHandler<State, CommandType, StreamEvent extends Event> = <Store extends EventStore>(eventStore: Store, id: string, commands: CommandType | CommandType[], handleOptions?: HandleOptions<Store>) => Promise<CommandHandlerResult<State, StreamEvent, Store>>;
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
export declare function defineCommandHandler<State, CommandType, StreamEvent extends Event>(config: DeciderConfig<State, CommandType, StreamEvent>): CommandHandler<State, CommandType, StreamEvent>;
export {};
//# sourceMappingURL=command-handler.d.ts.map