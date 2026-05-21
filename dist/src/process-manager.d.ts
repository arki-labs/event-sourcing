import type { AnyEvent, DefaultRecord, Event, EventTypeOf, GlobalPositionTypeOfRecordedMessageMetadata, MessageBus, MessageProcessorStartFrom, ReadEventMetadataWithGlobalPosition } from '@event-driven-io/emmett';
/**
 * Process Manager (Saga) handler context
 * This context is passed to the process manager handler function
 */
export type ProcessManagerContext = DefaultRecord & {
    /** Message bus for sending commands in response to events */
    messageBus: MessageBus;
};
/**
 * Process Manager handler function
 */
export type ProcessManagerHandler<EventType extends Event = AnyEvent, Context extends ProcessManagerContext = ProcessManagerContext> = (events: EventType[], context: Context) => Promise<void>;
/**
 * Process Manager configuration options
 */
export type ProcessManagerOptions<EventType extends Event = AnyEvent, Context extends ProcessManagerContext = ProcessManagerContext, CheckpointType = GlobalPositionTypeOfRecordedMessageMetadata<ReadEventMetadataWithGlobalPosition>> = {
    /** Unique identifier for the process manager */
    name: string;
    /** Event types the process manager will handle */
    eventTypes: EventTypeOf<EventType>[];
    /** Handler function that processes events */
    handler: ProcessManagerHandler<EventType, Context>;
    /**
     * Optional hooks for process manager lifecycle
     */
    hooks?: {
        /** Called when the process manager starts */
        onStart?: (context: Context) => Promise<void>;
        /** Called when the process manager closes */
        onClose?: () => Promise<void>;
    };
    /**
     * Optional configuration for resuming from specific checkpoint
     * Useful for long-running process managers
     */
    startFrom?: MessageProcessorStartFrom<CheckpointType>;
};
/**
 * Creates a process manager (saga) that subscribes to events and orchestrates responses
 * This is built on top of Emmett's reactor functionality
 */
export declare function createProcessManager<EventType extends Event = AnyEvent, Context extends ProcessManagerContext = ProcessManagerContext, CheckpointType = GlobalPositionTypeOfRecordedMessageMetadata<ReadEventMetadataWithGlobalPosition>>(options: ProcessManagerOptions<EventType, Context, CheckpointType>): import("@event-driven-io/emmett").MessageProcessor<EventType, ReadEventMetadataWithGlobalPosition, Context, CheckpointType>;
/**
 * State that can be maintained by a stateful process manager
 */
export type ProcessManagerState = DefaultRecord;
/**
 * Handler function for a stateful process manager
 */
export type StatefulProcessManagerHandler<EventType extends Event = AnyEvent, StateType extends ProcessManagerState = ProcessManagerState, Context extends ProcessManagerContext = ProcessManagerContext> = (events: EventType[], state: StateType, context: Context) => Promise<StateType>;
/**
 * Options for creating a stateful process manager
 */
export type StatefulProcessManagerOptions<EventType extends Event = AnyEvent, StateType extends ProcessManagerState = ProcessManagerState, Context extends ProcessManagerContext = ProcessManagerContext, CheckpointType = GlobalPositionTypeOfRecordedMessageMetadata<ReadEventMetadataWithGlobalPosition>> = Omit<ProcessManagerOptions<EventType, Context, CheckpointType>, 'handler'> & {
    /** Initial state for the process manager */
    initialState: StateType;
    /** Handler function that processes events and updates state */
    handler: StatefulProcessManagerHandler<EventType, StateType, Context>;
    /**
     * Store function that persists process manager state
     * Called after each successful event processing
     */
    storeState?: (state: StateType, processorId: string) => Promise<void>;
    /**
     * Load function that retrieves process manager state
     * Called during initialization
     */
    loadState?: (processorId: string) => Promise<StateType | null>;
};
/**
 * Creates a stateful process manager that maintains its own state
 * This is useful for tracking saga state across event processing
 */
export declare function createStatefulProcessManager<EventType extends Event = AnyEvent, StateType extends ProcessManagerState = ProcessManagerState, Context extends ProcessManagerContext = ProcessManagerContext, CheckpointType = GlobalPositionTypeOfRecordedMessageMetadata<ReadEventMetadataWithGlobalPosition>>(options: StatefulProcessManagerOptions<EventType, StateType, Context, CheckpointType>): import("@event-driven-io/emmett").MessageProcessor<EventType, ReadEventMetadataWithGlobalPosition, Context, CheckpointType>;
/**
 * Function to generate a unique idempotency key for an event
 * Used to ensure that a process manager only processes an event once
 *
 * @param event The event to generate an idempotency key for
 * @param processManagerId Optional identifier for the process manager
 * @returns A string that can be used as an idempotency key
 */
export declare function generateIdempotencyKey(event: Event<any, any, ReadEventMetadataWithGlobalPosition>, processManagerId?: string): string;
/**
 * Interface for a function to check if an event has already been processed
 */
export type IdempotencyCheck = (key: string) => Promise<boolean>;
/**
 * Interface for a function to mark an event as processed
 */
export type MarkProcessed = (key: string) => Promise<void>;
/**
 * Options for idempotent event processing
 */
export type IdempotentProcessingOptions = {
    /** Function to check if an event has already been processed */
    checkProcessed: IdempotencyCheck;
    /** Function to mark an event as processed */
    markProcessed: MarkProcessed;
    /** Optional process manager ID to include in the idempotency key */
    processManagerId?: string;
};
/**
 * Higher-order function that wraps a process manager handler to provide idempotent processing
 * This ensures that each event is only processed once, even if it's received multiple times
 *
 * @param handler The original process manager handler
 * @param options Options for idempotent processing
 * @returns A wrapped handler that implements idempotent processing
 */
export declare function withIdempotentProcessing<EventType extends Event<any, any, ReadEventMetadataWithGlobalPosition> = Event<any, any, ReadEventMetadataWithGlobalPosition>, Context extends ProcessManagerContext = ProcessManagerContext>(handler: ProcessManagerHandler<EventType, Context>, options: IdempotentProcessingOptions): ProcessManagerHandler<EventType, Context>;
//# sourceMappingURL=process-manager.d.ts.map