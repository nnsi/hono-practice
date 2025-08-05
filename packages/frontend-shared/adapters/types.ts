// Platform adapter interfaces for cross-platform compatibility

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
};

export type AlertOptions = {
  title: string;
  message?: string;
  buttons?: Array<{
    text: string;
    style?: "default" | "cancel" | "destructive";
    onPress?: () => void;
  }>;
};

// Storage adapter for persistent data
export type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<string[]>;
  clear?: () => Promise<void>;
};

// Network status adapter
export type NetworkAdapter = {
  isOnline: () => boolean;
  addListener: (callback: (isOnline: boolean) => void) => () => void;
};

// User notification adapter
export type NotificationAdapter = {
  toast: (options: ToastOptions) => void;
  alert: (title: string, message?: string) => Promise<void>;
  confirm: (title: string, message?: string) => Promise<boolean>;
};

// Event bus adapter for cross-component communication
export type EventBusAdapter = {
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (data?: unknown) => void) => () => void;
  off: (event: string, handler: (data?: unknown) => void) => void;
};

// Timer adapter for platform-specific timer implementations
export type TimerAdapter<T = unknown> = {
  setInterval: (callback: () => void, ms: number) => T;
  clearInterval: (id: T) => void;
};

// Navigation adapter for platform-specific routing
export type NavigationAdapter = {
  navigate: (path: string, params?: Record<string, unknown>) => void;
  replace: (path: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  canGoBack?: () => boolean;
  getParams?: <T = Record<string, unknown>>() => T;
  setParams?: (params: Record<string, unknown>) => void;
};

// Form field metadata
export type FormFieldMeta = {
  touched?: boolean;
  error?: string;
  isDirty?: boolean;
};

// Form field registration options
export type FormFieldOptions = {
  required?: boolean | string;
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: RegExp | { value: RegExp; message: string };
  validate?: (value: unknown) => string | boolean | Promise<string | boolean>;
  deps?: string[];
};

// Form adapter for platform-specific form handling
export type FormAdapter<TFormData = Record<string, unknown>> = {
  register: (
    name: keyof TFormData,
    options?: FormFieldOptions,
  ) => {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur?: () => void;
    error?: string;
  };
  getValue: (name: keyof TFormData) => unknown;
  setValue: (name: keyof TFormData, value: unknown) => void;
  getValues: () => TFormData;
  setValues: (values: Partial<TFormData>) => void;
  getFieldMeta: (name: keyof TFormData) => FormFieldMeta;
  handleSubmit: (
    onSubmit: (data: TFormData) => void | Promise<void>,
  ) => (event?: { preventDefault?: () => void }) => void;
  reset: (values?: Partial<TFormData>) => void;
  clearErrors: () => void;
  setError: (name: keyof TFormData, error: string) => void;
  watch?: (name: keyof TFormData | (keyof TFormData)[]) => unknown;
  formState: {
    errors: Record<keyof TFormData, string | undefined>;
    isDirty: boolean;
    isValid: boolean;
    isSubmitting: boolean;
    touchedFields: Record<keyof TFormData, boolean>;
  };
};

// Form field array operations
export type FormFieldArrayOperations<T = unknown> = {
  fields: T[];
  append: (value: T) => void;
  remove: (index: number) => void;
  insert?: (index: number, value: T) => void;
  move?: (from: number, to: number) => void;
  update?: (index: number, value: T) => void;
};

// Extended form adapter with field array support
export type FormAdapterWithFieldArray<TFormData = Record<string, unknown>> =
  FormAdapter<TFormData> & {
    useFieldArray?: <TFieldName extends keyof TFormData>(
      name: TFieldName,
    ) => FormFieldArrayOperations<
      TFormData[TFieldName] extends Array<infer U> ? U : never
    >;
  };

// File adapter for handling file operations
export type FileAdapter = {
  pickImage?: () => Promise<{
    uri: string;
    type?: string;
    name?: string;
  } | null>;
  pickFile?: () => Promise<{
    uri: string;
    type?: string;
    name?: string;
    size?: number;
  } | null>;
  createFormData?: (file: {
    uri: string;
    type?: string;
    name?: string;
  }) => FormData;
  resizeImage?: (
    uri: string,
    maxWidth: number,
    maxHeight: number,
  ) => Promise<string>;
};

// Platform adapter collection
export type PlatformAdapters<T = unknown> = {
  storage: StorageAdapter;
  network: NetworkAdapter;
  notification: NotificationAdapter;
  eventBus?: EventBusAdapter;
  timer?: TimerAdapter<T>;
  navigation?: NavigationAdapter;
  form?: <
    TFormData = Record<string, unknown>,
  >() => FormAdapterWithFieldArray<TFormData>;
  file?: FileAdapter;
};
