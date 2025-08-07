import type {
  FormAdapterWithFieldArray,
  FormFieldArrayOperations,
  FormFieldMeta,
  FormFieldOptions,
  NavigationAdapter,
  NetworkAdapter,
  NotificationAdapter,
  StorageAdapter,
  TimerAdapter,
} from "./types";

// Type definitions for React Native dependencies
type AsyncStorageType = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<string[]>;
};

type NetInfoType = {
  addEventListener: (
    listener: (state: { isConnected: boolean | null }) => void,
  ) => () => void;
  fetch: () => Promise<{ isConnected: boolean | null }>;
};

type AlertType = {
  alert: (
    title: string,
    message?: string,
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: "default" | "cancel" | "destructive";
    }>,
  ) => void;
};

// React Native Storage adapter
export function createReactNativeStorageAdapter(
  asyncStorage: AsyncStorageType,
): StorageAdapter {
  const getItem = async (key: string): Promise<string | null> => {
    try {
      return await asyncStorage.getItem(key);
    } catch (error) {
      console.error("Failed to get item from AsyncStorage:", error);
      return null;
    }
  };

  const setItem = async (key: string, value: string): Promise<void> => {
    try {
      await asyncStorage.setItem(key, value);
    } catch (error) {
      console.error("Failed to set item in AsyncStorage:", error);
      throw error;
    }
  };

  const removeItem = async (key: string): Promise<void> => {
    try {
      await asyncStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to remove item from AsyncStorage:", error);
      throw error;
    }
  };

  const getAllKeys = async (): Promise<string[]> => {
    try {
      return await asyncStorage.getAllKeys();
    } catch (error) {
      console.error("Failed to get all keys from AsyncStorage:", error);
      return [];
    }
  };

  const clear = async (): Promise<void> => {
    try {
      const keys = await asyncStorage.getAllKeys();
      await Promise.all(keys.map((key) => asyncStorage.removeItem(key)));
    } catch (error) {
      console.error("Failed to clear AsyncStorage:", error);
      throw error;
    }
  };

  return {
    getItem,
    setItem,
    removeItem,
    getAllKeys,
    clear,
  };
}

// React Native Network adapter
export function createReactNativeNetworkAdapter(
  netInfo: NetInfoType,
): NetworkAdapter {
  let isConnected = true;

  // Initialize connection state
  netInfo.fetch().then((state) => {
    isConnected = state.isConnected ?? true;
  });

  const isOnline = (): boolean => {
    return isConnected;
  };

  const addListener = (callback: (isOnline: boolean) => void): (() => void) => {
    const unsubscribe = netInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      isConnected = connected;
      callback(connected);
    });

    // Fetch initial state
    netInfo.fetch().then((state) => {
      const connected = state.isConnected ?? true;
      isConnected = connected;
      callback(connected);
    });

    return unsubscribe;
  };

  return {
    isOnline,
    addListener,
  };
}

// React Native Notification adapter
export function createReactNativeNotificationAdapter(
  Alert: AlertType,
): NotificationAdapter {
  const toast = (options: any): void => {
    // React Native doesn't have built-in toast, use Alert as fallback
    Alert.alert(options.title, options.description);
  };

  const alert = async (title: string, message?: string): Promise<void> => {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        {
          text: "OK",
          onPress: () => resolve(),
        },
      ]);
    });
  };

  const confirm = async (title: string, message?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        {
          text: "Cancel",
          onPress: () => resolve(false),
          style: "cancel",
        },
        {
          text: "OK",
          onPress: () => resolve(true),
        },
      ]);
    });
  };

  return {
    toast,
    alert,
    confirm,
  };
}

// React Native Event Bus adapter - can reuse the web implementation
export { createWebEventBusAdapter as createReactNativeEventBusAdapter } from "./web";

// React Native Timer adapter
export function createReactNativeTimerAdapter(): TimerAdapter<number> {
  const setIntervalFn = (callback: () => void, ms: number): number => {
    return setInterval(callback, ms) as unknown as number;
  };

  const clearIntervalFn = (id: number): void => {
    clearInterval(id);
  };

  return {
    setInterval: setIntervalFn,
    clearInterval: clearIntervalFn,
  };
}

// React Native Navigation adapter - requires navigation instance to be injected
export function createReactNativeNavigationAdapter(navigation: {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  replace: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  getState?: () => { routes: Array<{ params?: Record<string, unknown> }> };
  setParams: (params: Record<string, unknown>) => void;
}): NavigationAdapter {
  const navigate = (path: string, params?: Record<string, unknown>): void => {
    navigation.navigate(path, params);
  };

  const replace = (path: string, params?: Record<string, unknown>): void => {
    navigation.replace(path, params);
  };

  const goBack = (): void => {
    navigation.goBack();
  };

  const canGoBack = (): boolean => {
    return navigation.canGoBack();
  };

  const getParams = <T = Record<string, unknown>>(): T => {
    if (navigation.getState) {
      const state = navigation.getState();
      const currentRoute = state.routes[state.routes.length - 1];
      return (currentRoute?.params || {}) as T;
    }
    return {} as T;
  };

  const setParams = (params: Record<string, unknown>): void => {
    navigation.setParams(params);
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

// React Native Form adapter - lightweight implementation
export function createReactNativeFormAdapter<
  TFormData = Record<string, unknown>,
>(): FormAdapterWithFieldArray<TFormData> {
  let formValues: Partial<TFormData> = {};
  let formErrors: Record<string, string> = {};
  let touchedFields: Record<string, boolean> = {};
  let isSubmitting = false;
  const validators: Record<string, FormFieldOptions> = {};
  const listeners: Record<string, Array<() => void>> = {};

  const notifyListeners = (field: string) => {
    if (listeners[field]) {
      listeners[field].forEach((listener) => listener());
    }
  };

  const validateField = (name: string, value: unknown): string | undefined => {
    const options = validators[name];
    if (!options) return undefined;

    if (options.required && (!value || value === "")) {
      return typeof options.required === "string"
        ? options.required
        : "This field is required";
    }

    if (typeof value === "string" && options.minLength) {
      const minLength =
        typeof options.minLength === "object"
          ? options.minLength.value
          : options.minLength;
      const message =
        typeof options.minLength === "object"
          ? options.minLength.message
          : `Minimum length is ${minLength}`;
      if (value.length < minLength) return message;
    }

    if (typeof value === "string" && options.maxLength) {
      const maxLength =
        typeof options.maxLength === "object"
          ? options.maxLength.value
          : options.maxLength;
      const message =
        typeof options.maxLength === "object"
          ? options.maxLength.message
          : `Maximum length is ${maxLength}`;
      if (value.length > maxLength) return message;
    }

    if (options.pattern && typeof value === "string") {
      const pattern =
        typeof options.pattern === "object" && "value" in options.pattern
          ? options.pattern.value
          : options.pattern;
      const message =
        typeof options.pattern === "object" && "message" in options.pattern
          ? options.pattern.message
          : "Invalid format";
      if (!pattern.test(value)) return message;
    }

    if (options.validate) {
      const result = options.validate(value);
      if (typeof result === "string") return result;
      if (result === false) return "Validation failed";
    }

    return undefined;
  };

  const register = (name: keyof TFormData, options?: FormFieldOptions) => {
    const fieldName = name as string;
    if (options) {
      validators[fieldName] = options;
    }

    return {
      value: formValues[name],
      onChange: (value: unknown) => {
        formValues[name] = value as any;
        const error = validateField(fieldName, value);
        if (error) {
          formErrors[fieldName] = error;
        } else {
          delete formErrors[fieldName];
        }
        notifyListeners(fieldName);
      },
      onBlur: () => {
        touchedFields[fieldName] = true;
        notifyListeners(fieldName);
      },
      error: formErrors[fieldName],
    };
  };

  const getValue = (name: keyof TFormData): unknown => {
    return formValues[name];
  };

  const setValue = (name: keyof TFormData, value: unknown): void => {
    formValues[name] = value as any;
    const error = validateField(name as string, value);
    if (error) {
      formErrors[name as string] = error;
    } else {
      delete formErrors[name as string];
    }
    notifyListeners(name as string);
  };

  const getValues = (): TFormData => {
    return formValues as TFormData;
  };

  const setValues = (values: Partial<TFormData>): void => {
    Object.entries(values).forEach(([key, value]) => {
      setValue(key as keyof TFormData, value);
    });
  };

  const getFieldMeta = (name: keyof TFormData): FormFieldMeta => {
    return {
      touched: touchedFields[name as string],
      error: formErrors[name as string],
      isDirty: formValues[name] !== undefined,
    };
  };

  const handleSubmit = (
    onSubmit: (data: TFormData) => void | Promise<void>,
  ) => {
    return async (event?: { preventDefault?: () => void }) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }

      // Validate all fields
      Object.keys(validators).forEach((field) => {
        const error = validateField(
          field,
          formValues[field as keyof TFormData],
        );
        if (error) {
          formErrors[field] = error;
        } else {
          delete formErrors[field];
        }
        touchedFields[field] = true;
      });

      if (Object.keys(formErrors).length === 0) {
        isSubmitting = true;
        try {
          await onSubmit(formValues as TFormData);
        } finally {
          isSubmitting = false;
        }
      }
    };
  };

  const reset = (values?: Partial<TFormData>): void => {
    formValues = values || {};
    formErrors = {};
    touchedFields = {};
    isSubmitting = false;
    Object.keys(listeners).forEach((field) => notifyListeners(field));
  };

  const clearErrors = (): void => {
    formErrors = {};
    Object.keys(listeners).forEach((field) => notifyListeners(field));
  };

  const setError = (name: keyof TFormData, error: string): void => {
    formErrors[name as string] = error;
    notifyListeners(name as string);
  };

  const watch = (name: keyof TFormData | (keyof TFormData)[]): unknown => {
    if (Array.isArray(name)) {
      return name.map((n) => formValues[n]);
    }
    return formValues[name];
  };

  const useFieldArray = <TFieldName extends keyof TFormData>(
    name: TFieldName,
  ) => {
    // Get the current array value
    const currentValue = (formValues[name] || []) as any[];

    const append = (value: any) => {
      const newArray = [...currentValue, value];
      setValue(name, newArray);
    };

    const remove = (index: number) => {
      const newArray = currentValue.filter((_, i) => i !== index);
      setValue(name, newArray);
    };

    const insert = (index: number, value: any) => {
      const newArray = [...currentValue];
      newArray.splice(index, 0, value);
      setValue(name, newArray);
    };

    const move = (from: number, to: number) => {
      const newArray = [...currentValue];
      const item = newArray.splice(from, 1)[0];
      newArray.splice(to, 0, item);
      setValue(name, newArray);
    };

    const update = (index: number, value: any) => {
      const newArray = [...currentValue];
      newArray[index] = value;
      setValue(name, newArray);
    };

    return {
      fields: currentValue,
      append,
      remove,
      insert,
      move,
      update,
    } as FormFieldArrayOperations<
      TFormData[TFieldName] extends Array<infer U> ? U : never
    >;
  };

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
    formState: {
      get errors() {
        return formErrors as any;
      },
      get isDirty() {
        return Object.keys(formValues).length > 0;
      },
      get isValid() {
        return Object.keys(formErrors).length === 0;
      },
      get isSubmitting() {
        return isSubmitting;
      },
      get touchedFields() {
        return touchedFields as any;
      },
    },
    useFieldArray,
  };
}
