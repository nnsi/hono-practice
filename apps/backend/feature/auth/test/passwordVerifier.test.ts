import { hashWithSHA256 } from "@backend/lib/hash";
import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";

import {
  BcryptPasswordVerifier,
  MultiHashPasswordVerifier,
  SHA256PasswordVerifier,
} from "../passwordVerifier";

describe("PasswordVerifier", () => {
  describe("SHA256PasswordVerifier", () => {
    const verifier = new SHA256PasswordVerifier();

    it("SHA256でハッシュを生成できる", async () => {
      const password = "testPassword123";
      const hash = await verifier.hash(password);
      const expectedHash = await hashWithSHA256(password);

      expect(hash).toBe(expectedHash);
    });

    it("SHA256ハッシュを正しく検証できる", async () => {
      const password = "testPassword123";
      const hash = await verifier.hash(password);

      expect(await verifier.compare(password, hash)).toBe(true);
      expect(await verifier.compare("wrongPassword", hash)).toBe(false);
    });
  });

  describe("BcryptPasswordVerifier", () => {
    const verifier = new BcryptPasswordVerifier();

    it("bcryptでハッシュを生成できる", async () => {
      const password = "testPassword123";
      const hash = await verifier.hash(password);

      // bcryptハッシュは$2で始まる
      expect(hash).toMatch(/^\$2[aby]?\$/);
    });

    it("bcryptハッシュを正しく検証できる", async () => {
      const password = "testPassword123";
      const hash = await verifier.hash(password);

      expect(await verifier.compare(password, hash)).toBe(true);
      expect(await verifier.compare("wrongPassword", hash)).toBe(false);
    });
  });

  describe("MultiHashPasswordVerifier", () => {
    const verifier = new MultiHashPasswordVerifier();

    describe("hash()", () => {
      it("新規パスワードをbcryptで保存する", async () => {
        const password = "newPassword123";
        const hash = await verifier.hash(password);

        // bcryptハッシュは$2で始まる
        expect(hash).toMatch(/^\$2[aby]?\$/);

        // bcryptで検証できることを確認
        expect(await bcrypt.compare(password, hash)).toBe(true);
      });
    });

    describe("compare()", () => {
      it("SHA256でハッシュされたパスワードを検証できる（既存ユーザー向け）", async () => {
        const password = "legacyPassword123";
        const sha256Hash = await hashWithSHA256(password);

        expect(await verifier.compare(password, sha256Hash)).toBe(true);
        expect(await verifier.compare("wrongPassword", sha256Hash)).toBe(false);
      });

      it("bcryptでハッシュされたパスワードを検証できる（新規ユーザー向け）", async () => {
        const password = "newPassword123";
        const bcryptHash = await bcrypt.hash(password, 10);

        expect(await verifier.compare(password, bcryptHash)).toBe(true);
        expect(await verifier.compare("wrongPassword", bcryptHash)).toBe(false);
      });

      it("不正なハッシュ形式でもエラーにならずfalseを返す", async () => {
        const password = "testPassword123";
        const invalidHash = "invalid-hash-format";

        expect(await verifier.compare(password, invalidHash)).toBe(false);
      });
    });

    describe("パスワード変更シナリオ", () => {
      it("SHA256ユーザーがパスワード変更するとbcryptで保存される", async () => {
        // 既存ユーザーのSHA256ハッシュ
        const oldPassword = "oldPassword123";
        const oldHash = await hashWithSHA256(oldPassword);

        // 既存パスワードでログインできることを確認
        expect(await verifier.compare(oldPassword, oldHash)).toBe(true);

        // 新しいパスワードをhash()で保存
        const newPassword = "newPassword456";
        const newHash = await verifier.hash(newPassword);

        // 新しいパスワードはbcryptで保存される
        expect(newHash).toMatch(/^\$2[aby]?\$/);

        // 新しいパスワードで検証できる
        expect(await verifier.compare(newPassword, newHash)).toBe(true);
      });
    });
  });
});
