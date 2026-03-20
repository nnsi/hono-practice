import { useState } from "react";

import { AppleSignInButton } from "./AppleSignInButton";
import { GoogleSignInButton } from "./GoogleSignInButton";

type LoginFormProps = {
  onLogin: (loginId: string, password: string) => Promise<void>;
  onGoogleLogin: (credential: string) => Promise<void>;
  onAppleLogin: (credential: string) => Promise<void>;
};

export function LoginForm({
  onLogin,
  onGoogleLogin,
  onAppleLogin,
}: LoginFormProps) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await onLogin(loginId, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      await onGoogleLogin(credential);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Googleログインに失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError("Googleログインに失敗しました");
  };

  const handleAppleSuccess = async (credential: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      await onAppleLogin(credential);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Appleログインに失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleError = () => {
    setError("Appleログインに失敗しました");
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-3">
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />
      </div>
      <div className="mb-6">
        <AppleSignInButton
          onSuccess={handleAppleSuccess}
          onError={handleAppleError}
        />
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-100 px-3 text-gray-400 text-xs">または</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="loginId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            ログインID
          </label>
          <input
            id="loginId"
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none transition-all"
            required
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none transition-all"
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {isSubmitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
