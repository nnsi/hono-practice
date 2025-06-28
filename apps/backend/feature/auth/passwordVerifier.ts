import { hashWithSHA256 } from "@backend/lib/hash";
import { compare, hash } from "bcryptjs";

export type PasswordVerifier = {
  compare(password: string, hash: string): Promise<boolean>;
  hash(password: string): Promise<string>;
};

export class SHA256PasswordVerifier implements PasswordVerifier {
  async compare(password: string, hash: string): Promise<boolean> {
    const hashedPassword = await hashWithSHA256(password);
    return hashedPassword === hash;
  }

  async hash(password: string): Promise<string> {
    return hashWithSHA256(password);
  }
}

export class BcryptPasswordVerifier implements PasswordVerifier {
  private readonly saltRounds = 10;

  async compare(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
  }

  async hash(password: string): Promise<string> {
    return hash(password, this.saltRounds);
  }
}

export class MultiHashPasswordVerifier implements PasswordVerifier {
  private readonly verifiers: PasswordVerifier[];

  constructor() {
    this.verifiers = [
      new SHA256PasswordVerifier(),
      new BcryptPasswordVerifier(),
    ];
  }

  async compare(password: string, hash: string): Promise<boolean> {
    for (const verifier of this.verifiers) {
      try {
        const isValid = await verifier.compare(password, hash);
        if (isValid) {
          return true;
        }
      } catch (error) {
        console.debug("Password verification failed with verifier:", error);
      }
    }
    return false;
  }

  async hash(password: string): Promise<string> {
    // 新規パスワードはSHA256で保存
    return this.verifiers[0].hash(password);
  }
}
