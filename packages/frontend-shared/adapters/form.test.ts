import { describe, expect, it, vi } from "vitest";

import { createReactNativeFormAdapter, createWebFormAdapter } from "./index";

describe("FormAdapter", () => {
  describe("Web FormAdapter", () => {
    const createMockHookForm = () => ({
      register: vi.fn().mockReturnValue({
        onChange: vi.fn(),
        onBlur: vi.fn(),
        name: "test",
        ref: vi.fn(),
      }),
      watch: vi.fn().mockReturnValue(""),
      setValue: vi.fn(),
      getValues: vi.fn().mockReturnValue({}),
      handleSubmit: vi.fn((onSubmit) => () => onSubmit({})),
      reset: vi.fn(),
      clearErrors: vi.fn(),
      setError: vi.fn(),
      formState: {
        errors: {},
        isDirty: false,
        isValid: true,
        isSubmitting: false,
        touchedFields: {},
      },
    });

    it("should register a field", () => {
      const mockForm = createMockHookForm();
      const adapter = createWebFormAdapter(mockForm);

      const field = adapter.register("username", { required: true });

      expect(mockForm.register).toHaveBeenCalledWith("username", {
        required: true,
      });
      expect(field).toHaveProperty("value");
      expect(field).toHaveProperty("onChange");
      expect(field).toHaveProperty("onBlur");
    });

    it("should get and set field value", () => {
      const mockForm = createMockHookForm();
      mockForm.getValues.mockReturnValue({ username: "test" });

      const adapter = createWebFormAdapter(mockForm);

      adapter.setValue("username", "newValue");
      expect(mockForm.setValue).toHaveBeenCalledWith("username", "newValue", {
        shouldValidate: true,
      });

      adapter.getValue("username");
      expect(mockForm.getValues).toHaveBeenCalledWith("username");
    });

    it("should handle form submission", async () => {
      const mockForm = createMockHookForm();
      const onSubmit = vi.fn();
      const adapter = createWebFormAdapter(mockForm);

      const submitHandler = adapter.handleSubmit(onSubmit);
      await submitHandler();

      expect(mockForm.handleSubmit).toHaveBeenCalled();
    });

    it("should reset form", () => {
      const mockForm = createMockHookForm();
      const adapter = createWebFormAdapter(mockForm);

      adapter.reset({ username: "initial" });

      expect(mockForm.reset).toHaveBeenCalledWith({ username: "initial" });
    });

    it("should set error", () => {
      const mockForm = createMockHookForm();
      const adapter = createWebFormAdapter(mockForm);

      adapter.setError("username", "Username is required");

      expect(mockForm.setError).toHaveBeenCalledWith("username", {
        message: "Username is required",
      });
    });

    it("should watch field values", () => {
      const mockForm = createMockHookForm();
      mockForm.watch.mockReturnValue("watchedValue");

      const adapter = createWebFormAdapter(mockForm);
      const value = adapter.watch?.("username");

      expect(mockForm.watch).toHaveBeenCalledWith("username");
      expect(value).toBe("watchedValue");
    });
  });

  describe("React Native FormAdapter", () => {
    it("should register a field with validation", () => {
      const adapter = createReactNativeFormAdapter<{ username: string }>();

      const field = adapter.register("username", {
        required: "Username is required",
        minLength: { value: 3, message: "Minimum 3 characters" },
      });

      expect(field).toHaveProperty("value");
      expect(field).toHaveProperty("onChange");
      expect(field).toHaveProperty("onBlur");
      expect(field.value).toBeUndefined();
    });

    it("should validate required field", () => {
      const adapter = createReactNativeFormAdapter<{ username: string }>();

      const field = adapter.register("username", { required: true });

      // Empty value should have error
      field.onChange("");
      const meta = adapter.getFieldMeta("username");
      expect(meta.error).toBe("This field is required");

      // Valid value should clear error
      field.onChange("validUsername");
      const meta2 = adapter.getFieldMeta("username");
      expect(meta2.error).toBeUndefined();
    });

    it("should validate minLength", () => {
      const adapter = createReactNativeFormAdapter<{ username: string }>();

      const field = adapter.register("username", {
        minLength: { value: 5, message: "Too short" },
      });

      field.onChange("abc");
      const meta1 = adapter.getFieldMeta("username");
      expect(meta1.error).toBe("Too short");

      field.onChange("abcdef");
      const meta2 = adapter.getFieldMeta("username");
      expect(meta2.error).toBeUndefined();
    });

    it("should validate pattern", () => {
      const adapter = createReactNativeFormAdapter<{ email: string }>();

      const field = adapter.register("email", {
        pattern: {
          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: "Invalid email",
        },
      });

      field.onChange("invalid");
      const meta1 = adapter.getFieldMeta("email");
      expect(meta1.error).toBe("Invalid email");

      field.onChange("test@example.com");
      const meta2 = adapter.getFieldMeta("email");
      expect(meta2.error).toBeUndefined();
    });

    it("should handle form submission with validation", async () => {
      const adapter = createReactNativeFormAdapter<{
        username: string;
        email: string;
      }>();
      const onSubmit = vi.fn();

      adapter.register("username", { required: true });
      adapter.register("email", { required: true });

      adapter.setValue("username", "test");
      // email is missing

      const submitHandler = adapter.handleSubmit(onSubmit);
      await submitHandler();

      expect(onSubmit).not.toHaveBeenCalled();
      expect(adapter.formState.errors.email).toBe("This field is required");
    });

    it("should handle successful form submission", async () => {
      const adapter = createReactNativeFormAdapter<{ username: string }>();
      const onSubmit = vi.fn();

      adapter.register("username", { required: true });
      adapter.setValue("username", "testuser");

      const submitHandler = adapter.handleSubmit(onSubmit);
      await submitHandler();

      expect(onSubmit).toHaveBeenCalledWith({ username: "testuser" });
    });

    it("should reset form", () => {
      const adapter = createReactNativeFormAdapter<{
        username: string;
        email: string;
      }>();

      adapter.setValue("username", "test");
      adapter.setValue("email", "test@example.com");
      adapter.setError("username", "Some error");

      adapter.reset({ username: "initial" });

      expect(adapter.getValue("username")).toBe("initial");
      expect(adapter.getValue("email")).toBeUndefined();
      expect(adapter.formState.errors.username).toBeUndefined();
    });

    it("should watch field values", () => {
      const adapter = createReactNativeFormAdapter<{
        field1: string;
        field2: string;
      }>();

      adapter.setValue("field1", "value1");
      adapter.setValue("field2", "value2");

      const singleValue = adapter.watch?.("field1");
      expect(singleValue).toBe("value1");

      const multipleValues = adapter.watch?.(["field1", "field2"]);
      expect(multipleValues).toEqual(["value1", "value2"]);
    });

    it("should track form state correctly", () => {
      const adapter = createReactNativeFormAdapter<{ username: string }>();

      expect(adapter.formState.isDirty).toBe(false);
      expect(adapter.formState.isValid).toBe(true);

      adapter.register("username", { required: true });
      adapter.setValue("username", "");

      expect(adapter.formState.isDirty).toBe(true);
      expect(adapter.formState.isValid).toBe(false);
      expect(adapter.formState.errors.username).toBe("This field is required");

      adapter.setValue("username", "validUser");
      expect(adapter.formState.isValid).toBe(true);
    });

    it("should handle custom validation", () => {
      const adapter = createReactNativeFormAdapter<{ password: string }>();

      const field = adapter.register("password", {
        validate: (value) => {
          if (typeof value !== "string") return "Invalid type";
          if (value.length < 8) return "Password must be at least 8 characters";
          if (!/[A-Z]/.test(value))
            return "Password must contain uppercase letter";
          return true;
        },
      });

      field.onChange("short");
      expect(adapter.getFieldMeta("password").error).toBe(
        "Password must be at least 8 characters",
      );

      field.onChange("longenough");
      expect(adapter.getFieldMeta("password").error).toBe(
        "Password must contain uppercase letter",
      );

      field.onChange("LongEnough123");
      expect(adapter.getFieldMeta("password").error).toBeUndefined();
    });
  });
});
