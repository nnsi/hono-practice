import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskQuickAdd } from "./TaskQuickAdd";

const submit = vi.fn();
vi.mock("./useTaskQuickAdd", () => ({
  useTaskQuickAdd: () => ({
    title: "日本語",
    setTitle: vi.fn(),
    isSubmitting: false,
    hasError: false,
    canSubmit: true,
    submit,
  }),
}));
vi.mock("@packages/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

beforeEach(() => {
  submit.mockReset().mockResolvedValue(true);
});

describe("TaskQuickAdd", () => {
  it("does not submit during Japanese composition and restores focus after saving", async () => {
    render(<TaskQuickAdd />);
    const input = screen.getByRole("textbox");
    const form = screen.getByRole("form");
    fireEvent.compositionStart(input);
    expect(fireEvent.keyDown(input, { key: "Enter", keyCode: 229 })).toBe(
      false,
    );
    fireEvent.submit(form);
    expect(submit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.submit(form);
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
