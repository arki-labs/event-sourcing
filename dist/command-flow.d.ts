import type { Command, CommandHandlerResult, CommandHandlerRetryOptions, Decider, DefaultCommandMetadata, DefaultRecord, Event, EventStore, HandleOptions } from '@event-driven-io/emmett';
import type { z, ZodType, ZodTypeAny } from '@arki/contracts';
type BuildCommand<CommandType extends string, Data extends DefaultRecord, Metadata extends DefaultCommandMetadata | undefined> = Command<CommandType, Data, Metadata extends undefined ? undefined : Metadata>;
type HandlerMetadata<Metadata> = Metadata extends undefined ? undefined : Metadata;
type MetadataInput<Metadata> = Metadata extends undefined ? {
    metadata?: undefined;
} : {
    metadata: Metadata;
};
type StreamResolver<Context, CommandType> = (params: {
    command: CommandType;
    context: Context;
}) => string;
export type CommandFlowExecuteOptions<Context, Store extends EventStore, Input extends DefaultRecord, Metadata extends DefaultCommandMetadata | undefined> = {
    context: Context;
    eventStore: Store;
    input: Input;
    streamId?: string;
    handleOptions?: HandleOptions<Store>;
} & MetadataInput<Metadata>;
export type CommandFlowHandlerArgs<Context, Store extends EventStore, CommandType, Input extends DefaultRecord, Metadata extends DefaultCommandMetadata | undefined, State, StreamEvent extends Event> = {
    command: CommandType;
    context: Context;
    eventStore: Store;
    input: Input;
    metadata: HandlerMetadata<Metadata>;
    streamId?: string;
    handleOptions?: HandleOptions<Store>;
    run: (streamId: string, options?: {
        handleOptions?: HandleOptions<Store>;
    }) => Promise<CommandHandlerResult<State, StreamEvent, Store>>;
};
export type CommandFlowHandler<Context, Store extends EventStore, CommandType, Input extends DefaultRecord, Metadata extends DefaultCommandMetadata | undefined, State, StreamEvent extends Event, ReturnType> = (args: CommandFlowHandlerArgs<Context, Store, CommandType, Input, Metadata, State, StreamEvent>) => Promise<ReturnType> | ReturnType;
type CommandFlowExecutor<Context, Store extends EventStore, Input extends DefaultRecord, Metadata extends DefaultCommandMetadata | undefined, ReturnType> = (options: CommandFlowExecuteOptions<Context, Store, Input, Metadata>) => Promise<ReturnType>;
export type CommandFlow<Context, Store extends EventStore, CommandType extends string, Input extends DefaultRecord, Metadata extends DefaultCommandMetadata | undefined, State, StreamEvent extends Event, ReturnType> = CommandFlowExecutor<Context, Store, Input, Metadata, ReturnType> & {
    readonly commandType: CommandType;
    readonly schemas: {
        input: ZodTypeAny;
        metadata?: ZodTypeAny;
        event: ZodTypeAny;
        state?: ZodTypeAny;
    };
    readonly decider: Decider<State, BuildCommand<CommandType, Input, Metadata>, StreamEvent>;
    readonly createCommand: (input: Input, metadata?: HandlerMetadata<Metadata>) => BuildCommand<CommandType, Input, Metadata>;
    readonly runCommand: (options: {
        eventStore: Store;
        command: BuildCommand<CommandType, Input, Metadata>;
        streamId: string;
        handleOptions?: HandleOptions<Store>;
    }) => Promise<CommandHandlerResult<State, StreamEvent, Store>>;
    readonly resolveStreamId?: StreamResolver<Context, BuildCommand<CommandType, Input, Metadata>>;
};
export declare class CommandFlowBuilder<Context, Store extends EventStore, CommandType extends string, Input extends DefaultRecord = DefaultRecord, Metadata extends DefaultCommandMetadata | undefined = undefined, State = unknown, StreamEvent extends Event = Event> {
    private readonly commandType;
    private inputSchema?;
    private metadataSchema?;
    private eventSchema?;
    private stateSchema?;
    private currentDecider?;
    private streamResolver?;
    private mapToStreamId?;
    private retryOptions?;
    constructor(commandType: CommandType);
    input<Schema extends ZodType<DefaultRecord>>(schema: Schema): CommandFlowBuilder<Context, Store, CommandType, z.infer<Schema>, Metadata, State, StreamEvent>;
    metadata<Schema extends ZodType<DefaultCommandMetadata>>(schema: Schema): CommandFlowBuilder<Context, Store, CommandType, Input, z.infer<Schema>, State, StreamEvent>;
    events<Schema extends ZodType<Event>>(schema: Schema): CommandFlowBuilder<Context, Store, CommandType, Input, Metadata, State, z.infer<Schema>>;
    state<Schema extends ZodType>(schema: Schema): CommandFlowBuilder<Context, Store, CommandType, Input, Metadata, z.infer<Schema>, StreamEvent>;
    decider<NextState>(decider: Decider<NextState, BuildCommand<CommandType, Input, Metadata>, StreamEvent>): CommandFlowBuilder<Context, Store, CommandType, Input, Metadata, NextState, StreamEvent>;
    stream(resolver: StreamResolver<Context, BuildCommand<CommandType, Input, Metadata>>): this;
    mapStreamId(mapper: (id: string) => string): this;
    retry(options: CommandHandlerRetryOptions): this;
    handler<ReturnType = CommandHandlerResult<State, StreamEvent, Store>>(handler?: CommandFlowHandler<Context, Store, BuildCommand<CommandType, Input, Metadata>, Input, Metadata, State, StreamEvent, ReturnType>): CommandFlow<Context, Store, CommandType, Input, Metadata, State, StreamEvent, ReturnType>;
    private ensureInputSchema;
    private ensureEventSchema;
    private ensureDecider;
}
type Toolkit<Context, Store extends EventStore> = {
    command<CommandType extends string>(commandType: CommandType): CommandFlowBuilder<Context, Store, CommandType, DefaultRecord, undefined, unknown, Event>;
};
export declare const es: {
    $context<Context, Store extends EventStore = EventStore<import("@event-driven-io/emmett").AnyRecordedMessageMetadata>>(): Toolkit<Context, Store>;
};
export declare const eventSourcing: {
    $context<Context, Store extends EventStore = EventStore<import("@event-driven-io/emmett").AnyRecordedMessageMetadata>>(): Toolkit<Context, Store>;
};
export {};
//# sourceMappingURL=command-flow.d.ts.map