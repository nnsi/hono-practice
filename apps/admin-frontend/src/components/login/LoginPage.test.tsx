import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("shows the fallback message when Google client id is unavailable", () => {
    render(
      <LoginPage
        auth={{
          googleLogin: vi.fn(),
          devLogin: vi.fn(),
          error: null,
        }}
      />,
    );

    expect(
      screen.getByText("Google ログインは現在利用できません"),
    ).toBeTruthy();
    expect(screen.getByText("開発ログイン（Dev Bypass）")).toBeTruthy();
  });
});
