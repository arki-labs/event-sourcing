/**
 * Creates a strongly-typed command factory function.
 *
 * This factory validates input and metadata using Zod schemas before
 * creating commands that can be dispatched through a command flow or aggregate.
 *
 * @param config - Configuration object containing type, input schema, and optional metadata schema
 * @returns A factory function that validates and creates commands
 *
 * @example
 * ```ts
 * const createUserCommand = defineCommand({
 *   type: 'CreateUser',
 *   inputSchema: z.object({ name: z.string(), email: z.email() }),
 *   metadataSchema: z.object({ now: z.date(), issuedBy: z.string().uuid() }),
 * });
 *
 * const command = createUserCommand(
 *   { name: 'Ada', email: 'ada@example.org' },
 *   { now: new Date(), issuedBy: 'usr_123' },
 * );
 * ```
 */
export function defineCommand(config) {
    const { type, inputSchema, metadataSchema } = config;
    return (input, metadata) => {
        const validatedInput = inputSchema.parse(input);
        const validatedMetadata = metadataSchema ? metadataSchema.parse(metadata) : metadata;
        // Conditionally construct the command object based on whether metadata is provided
        return (validatedMetadata === undefined
            ? {
                type,
                data: validatedInput,
                kind: 'Command',
            }
            : {
                type,
                data: validatedInput,
                metadata: validatedMetadata,
                kind: 'Command',
            });
    };
}
//# sourceMappingURL=command.js.map