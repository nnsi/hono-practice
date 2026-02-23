import { useState } from "react";
import { GoogleSignInButton } from "./GoogleSignInButton";

type CreateUserFormProps = {
  onRegister: (name: string, loginId: string, password: string) => Promise<void>;
  onGoogleLogin: (credential: string) => Promise<void>;
};

export function CreateUserForm({ onRegister, onGoogleLogin }: CreateUserFormProps) {
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!loginId.trim()) return "ログインIDを入力してください";
    if (!password) return "パスワードを入力してください";
    if (password.length < 8) return "パスワードは8文字以上で入力してください";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onRegister(name, loginId, password);
    } catch {
      setError("ユーザー登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      await onGoogleLogin(credential);
    } catch {
      setError("Googleアカウントでの登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError("Googleアカウントでの登録に失敗しました");
  };

  return (
    <div className="w-full max-w-sm">
      {/* Google Sign-In */}
      <div className="mb-6">
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-50 px-2 text-gray-500">または</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="register-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            ユーザー名
            <span className="text-gray-400 text-xs ml-1">(任意)</span>
          </label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="表示名"
          />
        </div>
        <div>
          <label
            htmlFor="register-loginId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            ログインID
          </label>
          <input
            id="register-loginId"
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            required
          />
        </div>
        <div>
          <label
            htmlFor="register-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            パスワード
            <span className="text-gray-400 text-xs ml-1">(8文字以上)</span>
          </label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={8}
          />
        </div>
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "登録中..." : "新規登録"}
        </button>
      </form>
    </div>
  );
}
