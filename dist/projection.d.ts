/**
 * DOT projection entry point for `dot explain --as event-catalog`.
 *
 * Pure manifest in, JSON document out. It intentionally renders only
 * configure-time ES actions: command handlers collected dynamically through
 * deprecated 0.1.x options are executable but manifest-invisible.
 */
import type { JsonObject } from './dot-action.js';
type DotActionLike = {
    readonly id: string;
    readonly plugin: string;
    readonly binding: string;
    readonly direction: 'in' | 'out';
    readonly address?: string;
    readonly summary?: string;
    readonly meta?: JsonObject;
    readonly metaSchema?: string;
};
type DotManifestLike = {
    readonly app: {
        readonly name: string;
        readonly version?: string;
    };
    readonly actions: readonly DotActionLike[];
};
type CatalogCommand = JsonObject & {
    readonly type: string;
    readonly address: string;
    readonly summary?: string;
    readonly input: JsonObject;
};
type CatalogEvent = JsonObject & {
    readonly type: string;
    readonly address: string;
    readonly summary?: string;
    readonly data: JsonObject;
};
type CatalogPlugin = JsonObject & {
    readonly name: string;
    readonly commands: CatalogCommand[];
    readonly events: CatalogEvent[];
};
type EventCatalog = JsonObject & {
    readonly format: 'event-catalog';
    readonly app: {
        readonly name: string;
        readonly version?: string;
    };
    readonly plugins: CatalogPlugin[];
};
export declare function project(manifest: DotManifestLike): EventCatalog;
export {};
//# sourceMappingURL=projection.d.ts.map