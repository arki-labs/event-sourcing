import { z } from '@arki/contracts';
export const EVENT_SOURCING_ACTION_META_SCHEMA = '@arki/event-sourcing/action-meta@1';
export const EVENT_SOURCING_SCHEMA_REJECTED_CODE = 'EVENT_SOURCING_PLUGIN_E007';
export class EventSourcingActionError extends Error {
    code = EVENT_SOURCING_SCHEMA_REJECTED_CODE;
    constructor(message, cause) {
        super(message, { cause });
        this.name = 'EventSourcingActionError';
    }
}
function isJsonPrimitive(value) {
    return value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number';
}
function isPlainObject(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function isJsonValue(value) {
    if (isJsonPrimitive(value))
        return typeof value !== 'number' || Number.isFinite(value);
    if (Array.isArray(value))
        return value.every(isJsonValue);
    if (!isPlainObject(value))
        return false;
    return Object.values(value).every(isJsonValue);
}
export function isJsonObject(value) {
    return isPlainObject(value) && Object.values(value).every(isJsonValue);
}
function jsonDeepEqual(left, right) {
    if (isJsonPrimitive(left) || isJsonPrimitive(right))
        return Object.is(left, right);
    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length)
            return false;
        return left.every((value, index) => jsonDeepEqual(value, right[index]));
    }
    if (!isPlainObject(left) || !isPlainObject(right))
        return false;
    const leftEntries = Object.entries(left);
    const rightEntries = Object.entries(right);
    if (leftEntries.length !== rightEntries.length)
        return false;
    for (const [key, value] of leftEntries) {
        if (!Object.hasOwn(right, key) || !jsonDeepEqual(value, right[key]))
            return false;
    }
    return true;
}
function toJsonObject(value) {
    const serialized = JSON.stringify(value);
    if (serialized === undefined)
        throw new TypeError('Value must be a JSON-serializable object.');
    const parsed = JSON.parse(serialized);
    if (!isJsonObject(parsed) || !jsonDeepEqual(value, parsed)) {
        throw new TypeError('Value must be a JSON-serializable object without lossy coercions.');
    }
    return parsed;
}
export function schemaToJsonObject(schema, label) {
    try {
        const json = z.toJSONSchema(schema);
        const rest = { ...json };
        delete rest['$schema'];
        return toJsonObject(rest);
    }
    catch (error) {
        throw new EventSourcingActionError(`[event-sourcing] ${label} schema could not be converted to JSON Schema.`, error);
    }
}
//# sourceMappingURL=dot-action.js.map