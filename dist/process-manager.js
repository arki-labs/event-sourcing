import { reactor } from '@event-driven-io/emmett';
import { debugProcess } from './debug.js';
/**
 * Creates a process manager (saga) that subscribes to events and orchestrates responses
 * This is built on top of Emmett's reactor functionality
 */
export function createProcessManager(options) {
    const { name, eventTypes, handler, hooks, startFrom } = options;
    debugProcess('[%s] Creating process manager for event types: %o', name, eventTypes);
    return reactor({
        processorId: name,
        canHandle: eventTypes,
        startFrom,
        // Process events in batch mode
        eachBatch: async (events, context) => {
            debugProcess('[%s] Processing batch of %d events', name, events.length);
            await handler(events, context);
            debugProcess('[%s] Batch processed successfully', name);
        },
        // Pass through lifecycle hooks
        hooks: {
            onStart: async (context) => {
                debugProcess('[%s] Process manager starting', name);
                if (hooks?.onStart) {
                    await hooks.onStart(context);
                }
                debugProcess('[%s] Process manager started', name);
            },
            onClose: async () => {
                debugProcess('[%s] Process manager closing', name);
                if (hooks?.onClose) {
                    await hooks.onClose();
                }
                debugProcess('[%s] Process manager closed', name);
            },
        },
    });
}
/**
 * Creates a stateful process manager that maintains its own state
 * This is useful for tracking saga state across event processing
 */
export function createStatefulProcessManager(options) {
    const { name, eventTypes, initialState, handler, hooks, startFrom, storeState, loadState } = options;
    debugProcess('[%s] Creating stateful process manager for event types: %o', name, eventTypes);
    // Initialize state (will be updated during processing)
    let state = initialState;
    return reactor({
        processorId: name,
        canHandle: eventTypes,
        startFrom,
        hooks: {
            // Load state during startup
            onStart: async (context) => {
                debugProcess('[%s] Stateful process manager starting', name);
                if (loadState) {
                    debugProcess('[%s] Loading state from storage', name);
                    const loadedState = await loadState(name);
                    if (loadedState) {
                        state = loadedState;
                        debugProcess('[%s] State loaded successfully', name);
                    }
                    else {
                        debugProcess('[%s] No stored state found, using initial state', name);
                    }
                }
                // Call user-provided onStart hook if specified
                if (hooks?.onStart) {
                    await hooks.onStart(context);
                }
                debugProcess('[%s] Stateful process manager started', name);
            },
            // Call user-provided onClose hook if specified
            onClose: async () => {
                debugProcess('[%s] Stateful process manager closing', name);
                if (hooks?.onClose) {
                    await hooks.onClose();
                }
                debugProcess('[%s] Stateful process manager closed', name);
            },
        },
        // Process events and update state
        eachBatch: async (events, context) => {
            debugProcess('[%s] Processing batch of %d events (stateful)', name, events.length);
            // Update state based on events
            state = await handler(events, state, context);
            debugProcess('[%s] State updated after processing events', name);
            // Persist updated state if storage function provided
            if (storeState) {
                debugProcess('[%s] Storing updated state', name);
                await storeState(state, name);
                debugProcess('[%s] State stored successfully', name);
            }
        },
    });
}
/**
 * Function to generate a unique idempotency key for an event
 * Used to ensure that a process manager only processes an event once
 *
 * @param event The event to generate an idempotency key for
 * @param processManagerId Optional identifier for the process manager
 * @returns A string that can be used as an idempotency key
 */
export function generateIdempotencyKey(event, processManagerId) {
    // Get the event metadata
    const metadata = event.metadata;
    // Create an idempotency key using stream name, position, and optionally process manager ID
    const baseKey = `${metadata.streamName}:${metadata.streamPosition}:${event.type}`;
    // Add process manager ID if provided
    return processManagerId ? `${processManagerId}:${baseKey}` : baseKey;
}
/**
 * Higher-order function that wraps a process manager handler to provide idempotent processing
 * This ensures that each event is only processed once, even if it's received multiple times
 *
 * @param handler The original process manager handler
 * @param options Options for idempotent processing
 * @returns A wrapped handler that implements idempotent processing
 */
export function withIdempotentProcessing(handler, options) {
    const { checkProcessed, markProcessed, processManagerId } = options;
    debugProcess('[%s] Wrapping handler with idempotent processing', processManagerId ?? 'unknown');
    return async (events, context) => {
        debugProcess('[%s] Checking idempotency for %d events', processManagerId ?? 'unknown', events.length);
        // Filter out events that have already been processed
        const unprocessedEvents = [];
        const processedKeys = [];
        // Check each event
        for (const event of events) {
            const idempotencyKey = generateIdempotencyKey(event, processManagerId);
            const alreadyProcessed = await checkProcessed(idempotencyKey);
            if (alreadyProcessed) {
                debugProcess('[%s] Event already processed, skipping: %s', processManagerId ?? 'unknown', idempotencyKey);
            }
            else {
                unprocessedEvents.push(event);
                processedKeys.push(idempotencyKey);
            }
        }
        // If no events need processing, return early
        if (unprocessedEvents.length === 0) {
            debugProcess('[%s] All events already processed, skipping batch', processManagerId ?? 'unknown');
            return;
        }
        debugProcess('[%s] Processing %d unprocessed events', processManagerId ?? 'unknown', unprocessedEvents.length);
        // Process the unprocessed events
        await handler(unprocessedEvents, context);
        // Mark all events as processed
        debugProcess('[%s] Marking %d events as processed', processManagerId ?? 'unknown', processedKeys.length);
        await Promise.all(processedKeys.map(key => markProcessed(key)));
        debugProcess('[%s] Idempotent processing completed', processManagerId ?? 'unknown');
    };
}
//# sourceMappingURL=process-manager.js.map