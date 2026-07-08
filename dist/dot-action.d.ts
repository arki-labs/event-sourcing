import { z } from '@arki/contracts';
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
export type JsonObject = {
    [key: string]: JsonValue;
};
export declare const EVENT_SOURCING_ACTION_META_SCHEMA = "@arki/event-sourcing/action-meta@1";
export declare const EVENT_SOURCING_SCHEMA_REJECTED_CODE = "EVENT_SOURCING_PLUGIN_E007";
export type EventSourcingActionMeta = {
    readonly kind: 'command';
    readonly input: JsonObject;
} | {
    readonly kind: 'event';
    readonly data: JsonObject;
};
export type EventSourcingActionDeclaration = {
    readonly id: string;
    readonly binding: 'es';
    readonly direction: 'in' | 'out';
    readonly address: string;
    readonly metaSchema: typeof EVENT_SOURCING_ACTION_META_SCHEMA;
    readonly meta: EventSourcingActionMeta;
};
export declare class EventSourcingActionError extends Error {
    readonly code = "EVENT_SOURCING_PLUGIN_E007";
    constructor(message: string, cause: unknown);
}
export declare function isJsonObject(value: unknown): value is JsonObject;
export declare function schemaToJsonObject(schema: z.ZodType, label: string): JsonObject;
//# sourceMappingURL=dot-action.d.ts.map