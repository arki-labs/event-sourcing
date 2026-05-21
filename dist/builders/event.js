/**
 * Creates a strongly-typed event factory function.
 *
 * This factory validates data and metadata using Zod schemas before
 * creating events that can be appended to Emmett's event store.
 *
 * @param config - Configuration object containing type, data schema, and optional metadata schema
 * @returns A factory function that validates and creates events
 *
 * @example
 * ```ts
 * const userCreatedEvent = defineEvent({
 *   type: 'UserCreated',
 *   dataSchema: z.object({ userId: z.string().uuid(), name: z.string() }),
 *   metadataSchema: z.object({ now: z.date(), correlationId: z.string().uuid() }),
 * });
 *
 * const event = userCreatedEvent(
 *   { userId: 'usr_123', name: 'Ada' },
 *   { now: new Date(), correlationId: 'corr_456' },
 * );
 * ```
 */
export function defineEvent(config) {
    const { type, dataSchema, metadataSchema } = config;
    return (data, metadata) => {
        const validatedData = dataSchema.parse(data);
        const validatedMetadata = metadataSchema ? metadataSchema.parse(metadata) : metadata;
        // Conditionally construct the event object based on whether metadata is provided
        return (validatedMetadata === undefined
            ? {
                type,
                data: validatedData,
            }
            : {
                type,
                data: validatedData,
                metadata: validatedMetadata,
            });
    };
}
//# sourceMappingURL=event.js.map