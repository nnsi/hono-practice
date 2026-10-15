import { existsSync } from "node:fs";
import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { noopLogger } from "@backend/lib/logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { convertLocalUploadUrlToDataUrl } from "../localUploadDataUrl";

describe("localUploadDataUrl", () => {
  const uploadDir = "test-public/uploads";
  const iconPath = "icons/user-1/icon.png";
  const absoluteUploadDir = join(process.cwd(), "test-public", "uploads");

  beforeEach(async () => {
    if (existsSync(uploadDir)) {
      await rm(uploadDir, { recursive: true, force: true });
    }
    await mkdir(join(absoluteUploadDir, "icons", "user-1"), {
      recursive: true,
    });
    await writeFile(
      join(absoluteUploadDir, iconPath),
      Buffer.from("icon-data"),
    );
  });

  afterEach(async () => {
    if (existsSync(uploadDir)) {
      await rm(uploadDir, { recursive: true, force: true });
    }
  });

  it("returns the original url outside development", async () => {
    await expect(
      convertLocalUploadUrlToDataUrl(
        "http://localhost:3456/test-public/uploads/icons/user-1/icon.png",
        {
          isDevelopment: false,
          uploadDir,
          logger: noopLogger,
          warnMessage: "warn",
        },
      ),
    ).resolves.toBe(
      "http://localhost:3456/test-public/uploads/icons/user-1/icon.png",
    );
  });

  it("converts local upload urls to data urls", async () => {
    await expect(
      convertLocalUploadUrlToDataUrl(
        "http://localhost:3456/test-public/uploads/icons/user-1/icon.png",
        {
          isDevelopment: true,
          uploadDir,
          logger: noopLogger,
          warnMessage: "warn",
        },
      ),
    ).resolves.toBe(
      `data:image/png;base64,${Buffer.from("icon-data").toString("base64")}`,
    );
  });

  it("returns the original url when it is outside the configured upload dir", async () => {
    await expect(
      convertLocalUploadUrlToDataUrl(
        "http://localhost:3456/public/other/icon",
        {
          isDevelopment: true,
          uploadDir,
          logger: noopLogger,
          warnMessage: "warn",
        },
      ),
    ).resolves.toBe("http://localhost:3456/public/other/icon");
  });

  it("does not read files outside the upload dir via `..` traversal", async () => {
    const warn = vi.fn();
    const secretPath = join(process.cwd(), "test-public", "secret.txt");
    await writeFile(secretPath, "JWT_SECRET=leak");
    try {
      const url =
        "http://localhost:3456/test-public/uploads/icons/../../secret.txt";
      await expect(
        convertLocalUploadUrlToDataUrl(url, {
          isDevelopment: true,
          uploadDir,
          logger: { ...noopLogger, warn },
          warnMessage: "warn",
        }),
      ).resolves.toBe(url);
      expect(warn).toHaveBeenCalledWith(
        "warn",
        expect.objectContaining({ error: "path escapes upload directory" }),
      );
    } finally {
      await rm(secretPath, { force: true });
    }
  });

  it("does not read files outside the upload dir via a symlink inside it", async () => {
    const warn = vi.fn();
    const secretPath = join(process.cwd(), "test-public", "secret.txt");
    await writeFile(secretPath, "JWT_SECRET=leak");
    await symlink(secretPath, join(absoluteUploadDir, "icons", "link.png"));
    try {
      const url = "http://localhost:3456/test-public/uploads/icons/link.png";
      await expect(
        convertLocalUploadUrlToDataUrl(url, {
          isDevelopment: true,
          uploadDir,
          logger: { ...noopLogger, warn },
          warnMessage: "warn",
        }),
      ).resolves.toBe(url);
      expect(warn).toHaveBeenCalledWith(
        "warn",
        expect.objectContaining({ error: "path escapes upload directory" }),
      );
    } finally {
      await rm(secretPath, { force: true });
    }
  });

  it("logs and falls back to the original url when the file does not exist", async () => {
    const warn = vi.fn();

    await expect(
      convertLocalUploadUrlToDataUrl(
        "http://localhost:3456/test-public/uploads/icons/user-1/missing.webp",
        {
          isDevelopment: true,
          uploadDir,
          logger: {
            ...noopLogger,
            warn,
          },
          warnMessage: "Failed to convert activity icon URL to base64",
        },
      ),
    ).resolves.toBe(
      "http://localhost:3456/test-public/uploads/icons/user-1/missing.webp",
    );

    expect(warn).toHaveBeenCalledWith(
      "Failed to convert activity icon URL to base64",
      expect.objectContaining({
        url: "http://localhost:3456/test-public/uploads/icons/user-1/missing.webp",
      }),
    );
  });
});
