import bcrypt from "bcryptjs";

export interface PasswordVerifier {
  compare(password: string, hash: string): Promise<boolean>;
}

export class BcryptPasswordVerifier implements PasswordVerifier {
  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
