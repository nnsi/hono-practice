import { lstat, realpath, rm } from "node:fs/promises";
import { resolve } from "node:path";

import type { AppContext } from "@backend/context";
import type { UserId } from "@packages/domain/user/userSchema";
import { createUserId } from "@packages/domain/user/userSchema";

// Use the server-owned namespace, never client-editable icon URLs. This also
// removes replaced icons and uploads belonging to soft-deleted activities.
export function newUserFileDeletion(
  env: Pick<
    AppContext["Bindings"],
    "STORAGE_TYPE" | "UPLOAD_DIR" | "R2_BUCKET"
  >,
) {
  return async (userId: UserId): Promise<void> => {
    createUserId(userId); // Validate again before using an ID as a path/prefix.
    const prefix = `icons/${userId}/`;
    if (env.STORAGE_TYPE === "r2") {
      const bucket = env.R2_BUCKET;
      if (!bucket)
        throw new Error("R2 bucket is required for account deletion");
      // Re-list the first page after each delete: no cursor can skip objects as
      // pages shrink. Each request is bounded to the R2 bulk-delete limit.
      while (true) {
        const page = await bucket.list({ prefix, limit: 1000 });
        if (page.objects.length === 0) break;
        await bucket.delete(page.objects.map((object) => object.key));
      }
      return;
    }
    const root = resolve(env.UPLOAD_DIR ?? "public/uploads");
    const directory = resolve(root, prefix);
    let stat: Awaited<ReturnType<typeof lstat>>;
    try {
      stat = await lstat(directory);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        return;
      throw error;
    }
    // Reject symlinks including ancestor directories, even inside uploadDir.
    if (
      stat.isSymbolicLink() ||
      (await realpath(directory)) !== resolve(await realpath(root), prefix)
    ) {
      throw new Error("Unsafe user upload directory");
    }
    await rm(directory, { recursive: true, force: true });
  };
}
