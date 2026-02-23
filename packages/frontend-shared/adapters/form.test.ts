import { describe, expect, it, vi } from "vitest";

import { createWebFormAdapter } from "./index";

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

});
