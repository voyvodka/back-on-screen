declare module 'stremio-addon-sdk' {
  import type { RequestHandler } from 'express';

  export interface ManifestCatalog {
    type: string;
    id: string;
    name: string;
  }

  export interface ManifestConfigOption {
    key: string;
    type: string;
    default?: string;
    title?: string;
    options?: readonly string[];
    required?: boolean;
  }

  export interface AddonManifest {
    id: string;
    version: string;
    name: string;
    description?: string;
    logo?: string;
    resources: string[];
    types: string[];
    idPrefixes?: string[];
    catalogs?: ManifestCatalog[];
    behaviorHints?: Record<string, unknown>;
    config?: ManifestConfigOption[];
  }

  export interface CatalogHandlerArgs {
    type: string;
    id: string;
    config?: Record<string, string | undefined>;
  }

  export interface MetaHandlerArgs {
    type: string;
    id: string;
    config?: Record<string, string | undefined>;
  }

  export interface CatalogHandlerResponse {
    metas: Array<Record<string, unknown>>;
    cacheMaxAge?: number;
    staleRevalidate?: number;
    staleError?: number;
  }

  export interface MetaHandlerResponse {
    meta: Record<string, unknown> | null;
  }

  export class addonBuilder {
    constructor(manifest: AddonManifest);
    defineCatalogHandler(
      handler: (args: CatalogHandlerArgs) => Promise<CatalogHandlerResponse> | CatalogHandlerResponse
    ): void;
    defineMetaHandler(
      handler: (args: MetaHandlerArgs) => Promise<MetaHandlerResponse> | MetaHandlerResponse
    ): void;
    getInterface(): unknown;
  }

  export function getRouter(addonInterface: unknown): RequestHandler;
}
