/**
 * DOT projection entry point for `dot explain --as event-catalog`.
 *
 * Pure manifest in, JSON document out. It intentionally renders only
 * configure-time ES actions: command handlers collected dynamically through
 * deprecated 0.1.x options are executable but manifest-invisible.
 */
import { EVENT_SOURCING_ACTION_META_SCHEMA, EventSourcingActionError, isJsonObject, } from './dot-action.js';
function projectionError(message) {
    return new EventSourcingActionError(message, new TypeError(message));
}
function getGroup(groups, plugin) {
    const existing = groups.find(group => group.name === plugin);
    if (existing !== undefined)
        return existing;
    const created = { name: plugin, commands: [], events: [] };
    groups.push(created);
    return created;
}
function assertMeta(action) {
    if (action.metaSchema !== EVENT_SOURCING_ACTION_META_SCHEMA) {
        throw projectionError(`[event-sourcing] action "${action.id}" uses unsupported meta schema "${action.metaSchema ?? 'missing'}".`);
    }
    if (action.meta === undefined) {
        throw projectionError(`[event-sourcing] action "${action.id}" has no event-sourcing metadata.`);
    }
    return action.meta;
}
function commandFromAction(action, meta) {
    const input = meta['input'];
    if (meta['kind'] !== 'command' || !isJsonObject(input)) {
        throw projectionError(`[event-sourcing] action "${action.id}" has invalid command metadata.`);
    }
    return {
        type: action.id,
        address: action.address ?? action.id,
        ...(action.summary === undefined ? {} : { summary: action.summary }),
        input,
    };
}
function eventFromAction(action, meta) {
    const data = meta['data'];
    if (meta['kind'] !== 'event' || !isJsonObject(data)) {
        throw projectionError(`[event-sourcing] action "${action.id}" has invalid event metadata.`);
    }
    return {
        type: action.id,
        address: action.address ?? action.id,
        ...(action.summary === undefined ? {} : { summary: action.summary }),
        data,
    };
}
export function project(manifest) {
    const plugins = [];
    for (const action of manifest.actions) {
        if (action.binding !== 'es')
            continue;
        const meta = assertMeta(action);
        const group = getGroup(plugins, action.plugin);
        if (action.direction === 'in') {
            group.commands.push(commandFromAction(action, meta));
        }
        else {
            group.events.push(eventFromAction(action, meta));
        }
    }
    return {
        format: 'event-catalog',
        app: {
            name: manifest.app.name,
            ...(manifest.app.version === undefined ? {} : { version: manifest.app.version }),
        },
        plugins,
    };
}
//# sourceMappingURL=projection.js.map