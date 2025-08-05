import type {
  EventBusAdapter,
  FormAdapterWithFieldArray,
  FormFieldArrayOperations,
  FormFieldOptions,
  NavigationAdapter,
  NetworkAdapter,
  NotificationAdapter,
  StorageAdapter,
  TimerAdapter,
} from "./types";

// Web Storage adapter using localStorage
export function createWebStorageAdapter(): StorageAdapter {
  const getItem = async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("Failed to get item from localStorage:", error);
      return null;
    }
  };

  const setItem = async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
  };

  const removeItem = async (key: string): Promise<void> => {
    localStorage.removeItem(key);
  };

  const getAllKeys = async (): Promise<string[]> => {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error("Failed to get all keys from localStorage:", error);
      return [];
    }
  };

  const clear = async (): Promise<void> => {
    localStorage.clear();
  };

  return {
    getItem,
    setItem,
    removeItem,
    getAllKeys,
    clear,
  };
}

// Web Network adapter using navigator.onLine
export function createWebNetworkAdapter(): NetworkAdapter {
  const isOnline = (): boolean => {
    return navigator.onLine;
  };

  const addListener = (callback: (isOnline: boolean) => void): (() => void) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  };

  return {
    isOnline,
    addListener,
  };
}

// Web Notification adapter
export function createWebNotificationAdapter(): NotificationAdapter & {
  setToastCallback: (callback: (options: any) => void) => void;
} {
  let toastCallback: ((options: any) => void) | undefined;

  const setToastCallback = (callback: (options: any) => void) => {
    toastCallback = callback;
  };

  const toast = (options: any): void => {
    if (toastCallback) {
      toastCallback(options);
    } else {
      // Fallback to console if no toast UI is available
      console.log(`[Toast] ${options.title}:`, options.description);
    }
  };

  const alert = async (title: string, message?: string): Promise<void> => {
    window.alert(message || title);
  };

  const confirm = async (title: string, message?: string): Promise<boolean> => {
    return window.confirm(message || title);
  };

  return {
    toast,
    alert,
    confirm,
    setToastCallback,
  };
}

// Web Event Bus adapter
export function createWebEventBusAdapter(): EventBusAdapter {
  const listeners = new Map<string, Set<(data?: unknown) => void>>();

  const emit = (event: string, data?: unknown): void => {
    const handlers = listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  };

  const on = (
    event: string,
    handler: (data?: unknown) => void,
  ): (() => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(handler);

    // Return cleanup function
    return () => off(event, handler);
  };

  const off = (event: string, handler: (data?: unknown) => void): void => {
    const handlers = listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        listeners.delete(event);
      }
    }
  };

  return {
    emit,
    on,
    off,
  };
}

// Web Timer adapter
export function createWebTimerAdapter(): TimerAdapter<number> {
  const setInterval = (callback: () => void, ms: number): number => {
    return window.setInterval(callback, ms);
  };

  const clearInterval = (id: number): void => {
    window.clearInterval(id);
  };

  return {
    setInterval,
    clearInterval,
  };
}

// Web Navigation adapter - requires router instance to be injected
export function createWebNavigationAdapter(router: {
  navigate: (options: { to: string; params?: Record<string, unknown> }) => void;
  history: {
    replace: (options: {
      to: string;
      params?: Record<string, unknown>;
    }) => void;
    back: () => void;
    canGoBack: () => boolean;
  };
  state?: {
    location: {
      state?: Record<string, unknown>;
    };
  };
}): NavigationAdapter {
  const navigate = (path: string, params?: Record<string, unknown>): void => {
    router.navigate({ to: path, params });
  };

  const replace = (path: string, params?: Record<string, unknown>): void => {
    router.history.replace({ to: path, params });
  };

  const goBack = (): void => {
    router.history.back();
  };

  const canGoBack = (): boolean => {
    return router.history.canGoBack();
  };

  const getParams = <T = Record<string, unknown>>(): T => {
    return (router.state?.location?.state || {}) as T;
  };

  const setParams = (_params: Record<string, unknown>): void => {
    // In web apps, params are typically set via navigation
    console.warn(
      "setParams is not directly supported in web navigation. Use navigate or replace with params instead.",
    );
  };

  return {
    navigate,
    replace,
    goBack,
    canGoBack,
    getParams,
    setParams,
  };
}

// Web Form adapter - requires react-hook-form instance
export function createWebFormAdapter<TFormData = Record<string, unknown>>(
  hookFormInstance: {
    register: (name: string, options?: any) => any;
    watch: (name: string | string[]) => any;
    setValue: (name: string, value: any, options?: any) => void;
    getValues: (name?: string | string[]) => any;
    handleSubmit: (onSubmit: (data: any) => any) => (e?: any) => void;
    reset: (values?: any, options?: any) => void;
    clearErrors: (name?: string | string[]) => void;
    setError: (name: string, error: any, options?: any) => void;
    formState: {
      errors: Record<string, any>;
      isDirty: boolean;
      isValid: boolean;
      isSubmitting: boolean;
      touchedFields: Record<string, boolean>;
    };
    control?: any; // For useFieldArray
  },
  fieldArrayHook?: (options: { control: any; name: string }) => {
    fields: any[];
    append: (value: any) => void;
    remove: (index: number) => void;
    insert?: (index: number, value: any) => void;
    move?: (from: number, to: number) => void;
    update?: (index: number, value: any) => void;
  },
): FormAdapterWithFieldArray<TFormData> {
  const register = (name: keyof TFormData, options?: FormFieldOptions) => {
    const fieldRegistration = hookFormInstance.register(
      name as string,
      options,
    );

    return {
      value: hookFormInstance.watch(name as string),
      onChange: (value: unknown) => {
        hookFormInstance.setValue(name as string, value, {
          shouldValidate: true,
        });
      },
      onBlur: fieldRegistration.onBlur,
      error: hookFormInstance.formState.errors[name as string]?.message,
    };
  };

  const getValue = (name: keyof TFormData): unknown => {
    return hookFormInstance.getValues(name as string);
  };

  const setValue = (name: keyof TFormData, value: unknown): void => {
    hookFormInstance.setValue(name as string, value, { shouldValidate: true });
  };

  const getValues = (): TFormData => {
    return hookFormInstance.getValues();
  };

  const setValues = (values: Partial<TFormData>): void => {
    Object.entries(values).forEach(([key, value]) => {
      hookFormInstance.setValue(key, value, { shouldValidate: true });
    });
  };

  const getFieldMeta = (name: keyof TFormData) => {
    return {
      touched: hookFormInstance.formState.touchedFields[name as string],
      error: hookFormInstance.formState.errors[name as string]?.message,
      isDirty: true, // react-hook-form doesn't provide per-field dirty state easily
    };
  };

  const handleSubmit = (
    onSubmit: (data: TFormData) => void | Promise<void>,
  ) => {
    return hookFormInstance.handleSubmit(onSubmit);
  };

  const reset = (values?: Partial<TFormData>): void => {
    hookFormInstance.reset(values);
  };

  const clearErrors = (): void => {
    hookFormInstance.clearErrors();
  };

  const setError = (name: keyof TFormData, error: string): void => {
    hookFormInstance.setError(name as string, { message: error });
  };

  const watch = (name: keyof TFormData | (keyof TFormData)[]): unknown => {
    return hookFormInstance.watch(name as string | string[]);
  };

  const useFieldArray =
    fieldArrayHook && hookFormInstance.control
      ? <TFieldName extends keyof TFormData>(name: TFieldName) => {
          const arrayOperations = fieldArrayHook({
            control: hookFormInstance.control,
            name: name as string,
          });

          return {
            fields: arrayOperations.fields,
            append: arrayOperations.append,
            remove: arrayOperations.remove,
            insert: arrayOperations.insert,
            move: arrayOperations.move,
            update: arrayOperations.update,
          } as FormFieldArrayOperations<
            TFormData[TFieldName] extends Array<infer U> ? U : never
          >;
        }
      : undefined;

  return {
    register,
    getValue,
    setValue,
    getValues,
    setValues,
    getFieldMeta,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    watch,
    formState: hookFormInstance.formState as any,
    useFieldArray,
  };
}
