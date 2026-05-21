import type { Command, DeciderCommandHandler, Event } from '@event-driven-io/emmett';
export { DeciderCommandHandler } from '@event-driven-io/emmett';
export type { Command, CommandBus, CommandHandlerOptions, CommandHandlerResult, CommandHandlerRetryOptions, CommandTypeOf, DefaultCommandMetadata, } from '@event-driven-io/emmett';
/**
 * Generic type for a command handler function
 */
export type CommandHandlerType<C extends Command, State, StreamEvent extends Event> = ReturnType<typeof DeciderCommandHandler<State, C, StreamEvent>>;
/**
 * Command handler configuration
 */
export type CommandHandlerConfig<C extends Command = Command, State = unknown, StreamEvent extends Event = Event> = {
    commandType: string;
    handler: CommandHandlerType<C, State, StreamEvent>;
    getStreamName: (command: C) => string;
};
//# sourceMappingURL=command.d.ts.map