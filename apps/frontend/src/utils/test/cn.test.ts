import { describe, expect, it } from "vitest";

import { cn } from "../cn";

describe("cn", () => {
  it("単一のクラス名を返す", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("複数のクラス名をマージする", () => {
    expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
  });

  it("重複するTailwindクラスを適切にマージする", () => {
    // 後に指定されたクラスが優先される
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("p-4", "p-8")).toBe("p-8");
    expect(cn("mt-4 mb-4", "my-8")).toBe("my-8");
  });

  it("条件付きクラスを処理する", () => {
    expect(cn("base-class", true && "active-class")).toBe(
      "base-class active-class",
    );
    expect(cn("base-class", false && "inactive-class")).toBe("base-class");
  });

  it("undefinedやnullを無視する", () => {
    expect(cn("text-red-500", undefined, null, "bg-blue-500")).toBe(
      "text-red-500 bg-blue-500",
    );
  });

  it("オブジェクト形式のクラスを処理する", () => {
    expect(
      cn({
        "text-red-500": true,
        "bg-blue-500": true,
        hidden: false,
      }),
    ).toBe("text-red-500 bg-blue-500");
  });

  it("配列形式のクラスを処理する", () => {
    expect(cn(["text-red-500", "bg-blue-500"])).toBe(
      "text-red-500 bg-blue-500",
    );
  });

  it("複雑な組み合わせを処理する", () => {
    expect(
      cn(
        "base",
        ["array-class-1", "array-class-2"],
        {
          "object-class-1": true,
          "object-class-2": false,
        },
        undefined,
        "final-class",
      ),
    ).toBe("base array-class-1 array-class-2 object-class-1 final-class");
  });

  it("空の入力に対して空文字列を返す", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });

  it("Tailwindの修飾子付きクラスを適切に処理する", () => {
    expect(cn("hover:text-red-500", "hover:text-blue-500")).toBe(
      "hover:text-blue-500",
    );
    expect(cn("sm:p-4", "md:p-8")).toBe("sm:p-4 md:p-8");
  });
});
