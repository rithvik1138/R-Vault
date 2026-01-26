/// <reference types="vite/client" />

declare module "virtual:pwa-register" {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: any) => void;
  }

  export type RegisterSW = (options?: RegisterSWOptions) => (reloadPage?: boolean) => Promise<void>;
  
  export const registerSW: RegisterSW;
}
