import { EVENT_SOURCING_ACTION_META_SCHEMA, schemaToJsonObject } from '../dot-action.js';
function commandAction(type, inputSchema) {
    return {
        id: type,
        binding: 'es',
        direction: 'in',
        address: type,
        metaSchema: EVENT_SOURCING_ACTION_META_SCHEMA,
        meta: {
            kind: 'command',
            input: schemaToJsonObject(inputSchema, `command "${type}" input`),
        },
    };
}
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
    let cachedAction;
    const factory = (input, metadata) => {
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
    const getAction = () => {
        cachedAction ??= commandAction(type, inputSchema);
        return cachedAction;
    };
    Object.defineProperties(factory, {
        type: { value: type, enumerable: true },
        inputSchema: { value: inputSchema },
        ...(metadataSchema === undefined ? {} : { metadataSchema: { value: metadataSchema } }),
        id: { value: type, enumerable: true },
        binding: { value: 'es', enumerable: true },
        direction: { value: 'in', enumerable: true },
        address: { value: type, enumerable: true },
        metaSchema: { value: EVENT_SOURCING_ACTION_META_SCHEMA, enumerable: true },
        meta: {
            enumerable: true,
            get() {
                return getAction().meta;
            },
        },
        toDotAction: { value: getAction },
    });
    return factory;
}
//# sourceMappingURL=command.js.map