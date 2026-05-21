import { DeciderCommandHandler } from '@event-driven-io/emmett';
import { debugCommand } from './debug.js';
export class CommandFlowBuilder {
    commandType;
    inputSchema;
    metadataSchema;
    eventSchema;
    stateSchema;
    currentDecider;
    streamResolver;
    mapToStreamId;
    retryOptions;
    constructor(commandType) {
        this.commandType = commandType;
        debugCommand('Creating command flow builder for command: %s', commandType);
    }
    input(schema) {
        this.inputSchema = schema;
        debugCommand('[%s] Registered input schema', this.commandType);
        return this;
    }
    metadata(schema) {
        this.metadataSchema = schema;
        debugCommand('[%s] Registered metadata schema', this.commandType);
        return this;
    }
    events(schema) {
        this.eventSchema = schema;
        debugCommand('[%s] Registered event schema', this.commandType);
        return this;
    }
    state(schema) {
        this.stateSchema = schema;
        debugCommand('[%s] Registered state schema', this.commandType);
        return this;
    }
    decider(decider) {
        this.currentDecider = decider;
        debugCommand('[%s] Registered decider', this.commandType);
        return this;
    }
    stream(resolver) {
        this.streamResolver = resolver;
        debugCommand('[%s] Registered stream resolver', this.commandType);
        return this;
    }
    mapStreamId(mapper) {
        this.mapToStreamId = mapper;
        debugCommand('[%s] Registered stream ID mapper', this.commandType);
        return this;
    }
    retry(options) {
        this.retryOptions = options;
        debugCommand('[%s] Configured retry options', this.commandType);
        return this;
    }
    handler(handler) {
        const inputSchema = this.ensureInputSchema();
        const eventSchema = this.ensureEventSchema();
        const metadataSchema = this.metadataSchema;
        const stateSchema = this.stateSchema;
        const decider = this.ensureDecider();
        const streamResolver = this.streamResolver;
        const mapToStreamId = this.mapToStreamId;
        const retryOptions = this.retryOptions;
        const validatedDecider = {
            decide: (command, state) => {
                const safeState = stateSchema ? stateSchema.parse(state) : state;
                const result = decider.decide(command, safeState);
                const events = Array.isArray(result) ? result : [result];
                const parsed = events.map(evt => eventSchema.parse(evt));
                return Array.isArray(result) ? parsed : parsed[0];
            },
            evolve: (state, event) => {
                const parsedEvent = eventSchema.parse(event);
                const nextState = decider.evolve(state, parsedEvent);
                return stateSchema ? stateSchema.parse(nextState) : nextState;
            },
            initialState: () => {
                const initial = decider.initialState();
                return stateSchema ? stateSchema.parse(initial) : initial;
            },
        };
        const runner = DeciderCommandHandler({
            decide: validatedDecider.decide,
            evolve: validatedDecider.evolve,
            initialState: validatedDecider.initialState,
            mapToStreamId,
            retry: retryOptions,
        });
        const defaultHandler = async ({ command, context, run, streamId, handleOptions }) => {
            if (!streamResolver && !streamId) {
                debugCommand('[%s] ERROR: No stream resolver or streamId provided', this.commandType);
                throw new Error(`No stream resolver provided for command "${this.commandType}". Call .stream(...) or provide streamId.`);
            }
            debugCommand('[%s] Resolving stream ID', this.commandType);
            const resolvedStream = streamId ?? streamResolver?.({ command, context });
            if (!resolvedStream) {
                debugCommand('[%s] ERROR: Failed to resolve stream ID', this.commandType);
                throw new Error(`Unable to resolve stream id for command "${this.commandType}". Provide a streamId when executing.`);
            }
            debugCommand('[%s] Stream resolved to: %s', this.commandType, resolvedStream);
            return run(resolvedStream, { handleOptions });
        };
        const finalHandler = (handler ?? defaultHandler);
        const flowExecutor = async (options) => {
            const { context, eventStore, input, streamId, handleOptions } = options;
            const metadataOption = options;
            debugCommand('[%s] Executing command flow with input: %O', this.commandType, input);
            const parsedInput = inputSchema.parse(input);
            debugCommand('[%s] Input validation passed', this.commandType);
            let parsedMetadata;
            if (metadataSchema) {
                if (!('metadata' in metadataOption)) {
                    debugCommand('[%s] ERROR: Metadata expected but not provided', this.commandType);
                    throw new Error(`Metadata expected for command "${this.commandType}" but none was provided.`);
                }
                const metadataValue = metadataOption.metadata;
                parsedMetadata = metadataSchema.parse(metadataValue);
                debugCommand('[%s] Metadata validation passed', this.commandType);
            }
            else {
                parsedMetadata = undefined;
            }
            const command = (metadataSchema
                ? {
                    type: this.commandType,
                    data: parsedInput,
                    metadata: parsedMetadata,
                    kind: 'Command',
                }
                : {
                    type: this.commandType,
                    data: parsedInput,
                    kind: 'Command',
                });
            debugCommand('[%s] Command created successfully', this.commandType);
            const run = (resolvedStreamId, runOptions) => {
                debugCommand('[%s] Running command on stream: %s', this.commandType, resolvedStreamId);
                return runner(eventStore, resolvedStreamId, command, runOptions?.handleOptions ?? handleOptions);
            };
            const result = await finalHandler({
                command,
                context,
                eventStore,
                input: parsedInput,
                metadata: parsedMetadata,
                streamId,
                handleOptions,
                run,
            });
            debugCommand('[%s] Command execution completed successfully', this.commandType);
            return result;
        };
        const createCommand = (input, metadataValue) => {
            const parsedInput = inputSchema.parse(input);
            if (metadataSchema) {
                if (metadataValue === undefined) {
                    throw new Error(`Metadata expected for command "${this.commandType}" but none was provided.`);
                }
                const parsedMetadata = metadataSchema.parse(metadataValue);
                return {
                    type: this.commandType,
                    data: parsedInput,
                    metadata: parsedMetadata,
                    kind: 'Command',
                };
            }
            if (metadataValue !== undefined) {
                throw new Error(`Metadata value provided for command "${this.commandType}" without metadata schema. Add .metadata(...) to the builder.`);
            }
            return {
                type: this.commandType,
                data: parsedInput,
                kind: 'Command',
            };
        };
        const schemas = {
            input: inputSchema,
            ...(metadataSchema ? { metadata: metadataSchema } : {}),
            event: eventSchema,
            ...(stateSchema ? { state: stateSchema } : {}),
        };
        const runCommand = ({ eventStore, command, streamId, handleOptions, }) => {
            if (!streamId) {
                throw new Error(`Missing streamId when running command "${this.commandType}".`);
            }
            return runner(eventStore, streamId, command, handleOptions);
        };
        const flow = Object.assign(flowExecutor, {
            commandType: this.commandType,
            schemas,
            decider: validatedDecider,
            createCommand,
            runCommand,
        });
        if (streamResolver) {
            Object.assign(flow, {
                resolveStreamId: (resolverParams) => streamResolver(resolverParams),
            });
        }
        debugCommand('[%s] Command flow built successfully', this.commandType);
        return flow;
    }
    ensureInputSchema() {
        if (!this.inputSchema) {
            throw new Error(`Command "${this.commandType}" is missing an input schema. Call .input(...) before defining the handler.`);
        }
        return this.inputSchema;
    }
    ensureEventSchema() {
        if (!this.eventSchema) {
            throw new Error(`Command "${this.commandType}" is missing an event schema. Call .events(...) before defining the handler.`);
        }
        return this.eventSchema;
    }
    ensureDecider() {
        if (!this.currentDecider) {
            throw new Error(`Command "${this.commandType}" is missing a decider definition. Call .decider(...) before defining the handler.`);
        }
        return this.currentDecider;
    }
}
const createToolkit = () => ({
    command: commandType => new CommandFlowBuilder(commandType),
});
export const es = {
    $context() {
        return createToolkit();
    },
};
export const eventSourcing = es;
//# sourceMappingURL=command-flow.js.map