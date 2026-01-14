import type {
  FileAdapter,
  FormAdapterWithFieldArray,
  NotificationAdapter,
} from "@packages/frontend-shared/adapters";
import type {
  GetActivityResponse,
  UpdateActivityRequest,
} from "@packages/types";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUseActivityEdit } from "./useActivityEdit";

describe("createUseActivityEdit", () => {
  let mockForm: FormAdapterWithFieldArray<UpdateActivityRequest>;
  let mockNotification: NotificationAdapter;
  let mockFile: FileAdapter;
  let mockApi: any;
  let mockOnClose: () => void;

  const mockActivity: GetActivityResponse = {
    id: "test-id",

    name: "Test Activity",
    description: "Test Description",
    quantityUnit: "回",
    emoji: "🏃",
    iconType: "emoji" as const,
    showCombinedStats: false,
    kinds: [
      { id: "kind-1", name: "Kind 1" },
      { id: "kind-2", name: "Kind 2" },
    ],
  };

  beforeEach(() => {
    // Reset all mocks
    mockForm = {
      register: vi.fn().mockReturnValue({
        value: "",
        onChange: vi.fn(),
        onBlur: vi.fn(),
        error: undefined,
      }),
      getValue: vi.fn(),
      setValue: vi.fn(),
      getValues: vi.fn().mockReturnValue({}),
      setValues: vi.fn(),
      getFieldMeta: vi
        .fn()
        .mockReturnValue({ touched: false, error: undefined }),
      handleSubmit: vi.fn((onSubmit) => () => {
        const values = mockForm.getValues();
        return onSubmit(values);
      }),
      reset: vi.fn(),
      clearErrors: vi.fn(),
      setError: vi.fn(),
      watch: vi.fn(),
      formState: {
        errors: { activity: undefined, kinds: undefined },
        isDirty: false,
        isValid: true,
        isSubmitting: false,
        touchedFields: { activity: false, kinds: false },
      },
      useFieldArray: vi.fn().mockReturnValue({
        fields: [],
        append: vi.fn(),
        remove: vi.fn(),
      }),
    };

    mockNotification = {
      toast: vi.fn(),
      alert: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
    };

    mockFile = {
      pickImage: vi
        .fn()
        .mockResolvedValue({ uri: "test.jpg", type: "image/jpeg" }),
      createFormData: vi.fn().mockReturnValue(new FormData()),
    };

    mockApi = {
      updateActivity: vi.fn().mockResolvedValue(undefined),
      deleteActivity: vi.fn().mockResolvedValue(undefined),
      uploadActivityIcon: vi.fn().mockResolvedValue(undefined),
      deleteActivityIcon: vi.fn().mockResolvedValue(undefined),
    };

    mockOnClose = vi.fn();
  });

  it("should initialize form with activity data", () => {
    renderHook(() =>
      createUseActivityEdit(
        {
          form: mockForm,
          notification: mockNotification,
          file: mockFile,
          api: mockApi,
        },
        mockActivity,
        mockOnClose,
      ),
    );

    expect(mockForm.reset).toHaveBeenCalledWith({
      activity: {
        name: "Test Activity",
        description: "Test Description",
        quantityUnit: "回",
        emoji: "🏃",
        showCombinedStats: false,
      },
      kinds: [
        { id: "kind-1", name: "Kind 1", color: "" },
        { id: "kind-2", name: "Kind 2", color: "" },
      ],
    });
  });

  it("should handle activity update", async () => {
    const { result } = renderHook(() =>
      createUseActivityEdit(
        {
          form: mockForm,
          notification: mockNotification,
          file: mockFile,
          api: mockApi,
        },
        mockActivity,
        mockOnClose,
      ),
    );

    const updateData: UpdateActivityRequest = {
      activity: {
        name: "Updated Activity",
        description: "Updated Description",
        quantityUnit: "分",
        emoji: "🚴",
        showCombinedStats: true,
      },
      kinds: [],
    };

    mockForm.getValues = vi.fn().mockReturnValue(updateData);

    await act(async () => {
      await result.current.actions.onSubmit();
    });

    expect(mockApi.updateActivity).toHaveBeenCalledWith({
      id: "test-id",
      data: updateData,
    });
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "アクティビティを更新しました",
      variant: "default",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should handle activity deletion", async () => {
    const { result } = renderHook(() =>
      createUseActivityEdit(
        {
          form: mockForm,
          notification: mockNotification,
          file: mockFile,
          api: mockApi,
        },
        mockActivity,
        mockOnClose,
      ),
    );

    await act(async () => {
      await result.current.actions.onDelete();
    });

    expect(mockApi.deleteActivity).toHaveBeenCalledWith("test-id");
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "アクティビティを削除しました",
      variant: "default",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should handle kind management", () => {
    const mockAppend = vi.fn();
    const mockRemove = vi.fn();

    mockForm.useFieldArray = vi.fn().mockReturnValue({
      fields: mockActivity.kinds,
      append: mockAppend,
      remove: mockRemove,
    });

    const { result } = renderHook(() =>
      createUseActivityEdit(
        {
          form: mockForm,
          notification: mockNotification,
          file: mockFile,
          api: mockApi,
        },
        mockActivity,
        mockOnClose,
      ),
    );

    // Add kind
    act(() => {
      result.current.actions.onAddKind();
    });
    expect(mockAppend).toHaveBeenCalledWith({ name: "", color: "" });

    // Remove kind
    act(() => {
      result.current.actions.onRemoveKind(1);
    });
    expect(mockRemove).toHaveBeenCalledWith(1);
  });

  it("should handle icon change to upload", async () => {
    const { result } = renderHook(() =>
      createUseActivityEdit(
        {
          form: mockForm,
          notification: mockNotification,
          file: mockFile,
          api: mockApi,
        },
        mockActivity,
        mockOnClose,
      ),
    );

    const file = new File(["content"], "test.png", { type: "image/png" });

    await act(async () => {
      await result.current.iconProps.onChange({
        type: "upload",
        file,
        preview: "blob:preview",
      });
    });

    expect(mockApi.uploadActivityIcon).toHaveBeenCalledWith({
      id: "test-id",
      file: file,
    });
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "アイコンをアップロードしました",
      variant: "default",
    });
  });

  it("should handle icon change to emoji and delete uploaded icon", async () => {
    const activityWithUploadedIcon: GetActivityResponse = {
      ...mockActivity,
      iconType: "upload",
    };

    const { result } = renderHook(() =>
      createUseActivityEdit(
        {
          form: mockForm,
          notification: mockNotification,
          file: mockFile,
          api: mockApi,
        },
        activityWithUploadedIcon,
        mockOnClose,
      ),
    );

    await act(async () => {
      await result.current.iconProps.onChange({
        type: "emoji",
        emoji: "🎉",
      });
    });

    expect(mockApi.deleteActivityIcon).toHaveBeenCalledWith("test-id");
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "アイコンを削除しました",
      variant: "default",
    });
  });

  it("should handle icon picker for mobile", async () => {
    const { result } = renderHook(() =>
      createUseActivityEdit(
        {
          form: mockForm,
          notification: mockNotification,
          file: mockFile,
          api: mockApi,
        },
        mockActivity,
        mockOnClose,
      ),
    );

    const pickedImage = await act(async () => {
      return await result.current.iconProps.pick();
    });

    expect(mockFile.pickImage).toHaveBeenCalled();
    expect(pickedImage).toEqual({ uri: "test.jpg", type: "image/jpeg" });
  });

  it("should handle errors gracefully", async () => {
    mockApi.updateActivity.mockRejectedValue(new Error("Update failed"));

    const { result } = renderHook(() =>
      createUseActivityEdit(
        {
          form: mockForm,
          notification: mockNotification,
          file: mockFile,
          api: mockApi,
        },
        mockActivity,
        mockOnClose,
      ),
    );

    await act(async () => {
      await result.current.actions.onSubmit();
    });

    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "更新に失敗しました",
      description: "Update failed",
      variant: "destructive",
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should handle missing file adapter", async () => {
    const { result } = renderHook(() =>
      createUseActivityEdit(
        { form: mockForm, notification: mockNotification, api: mockApi },
        mockActivity,
        mockOnClose,
      ),
    );

    const pickedImage = await act(async () => {
      return await result.current.iconProps.pick();
    });

    expect(pickedImage).toBeNull();
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "画像選択は利用できません",
      variant: "destructive",
    });
  });
});
