declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
    export function set(key: string, value: string): void;
  }
}

// Type declarations for Deno standard library HTTP server
declare module "https://deno.land/std@*/http/server.ts" {
  export interface ServeInit {
    port?: number;
    hostname?: string;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    init?: ServeInit
  ): {
    finished: Promise<void>;
    shutdown(): Promise<void>;
  };
}

// Type declarations for Supabase client
declare module "https://esm.sh/@supabase/supabase-js@*" {
  export interface SupabaseClientOptions {
    auth?: {
      persistSession?: boolean;
      autoRefreshToken?: boolean;
      detectSessionInUrl?: boolean;
    };
  }

  export interface PostgrestFilterBuilder<T = unknown> {
    select(columns?: string): this;
    eq(column: string, value: unknown): this;
    then<TResult>(onfulfilled?: (value: { data: T[] | null; error: Error | null }) => TResult | PromiseLike<TResult>): Promise<TResult>;
  }

  export interface SupabaseClient {
    from(table: string): PostgrestFilterBuilder;
  }

  export function createClient(
    url: string,
    key: string,
    options?: SupabaseClientOptions
  ): SupabaseClient;
}

