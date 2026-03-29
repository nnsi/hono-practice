import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy } from "lucide-react";

import { API_SCOPES, ENDPOINT_GROUPS } from "./apiReferenceData";
import { EndpointSection } from "./EndpointSection";

const BASE_URL = "https://api.actiko.app/api/v1";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded hover:bg-gray-700 transition-colors"
      title="Copy"
    >
      {copied ? (
        <Check size={14} className="text-emerald-400" />
      ) : (
        <Copy size={14} className="text-gray-400" />
      )}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 flex items-center justify-between gap-2">
      <code className="text-sm text-gray-100 overflow-x-auto whitespace-nowrap">
        {code}
      </code>
      <CopyButton text={code} />
    </div>
  );
}

export function ApiReferencePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          戻る
        </button>

        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Actiko API Reference
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          外部アプリケーションから活動ログやタスクを操作するためのREST
          APIです。Premium プランで利用できます。
        </p>

        {/* Base URL */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Base URL</h2>
          <CodeBlock code={BASE_URL} />
        </section>

        {/* Authentication */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Authentication
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            設定画面でAPIキーを発行し、全リクエストの
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
              Authorization
            </code>
            ヘッダーに Bearer トークンとして含めてください。
          </p>
          <CodeBlock code="Authorization: Bearer YOUR_API_KEY" />
        </section>

        {/* Scopes */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Scopes</h2>
          <p className="text-sm text-gray-600 mb-3">
            APIキー作成時にスコープを指定できます。各エンドポイントは必要なスコープを持つキーでのみアクセス可能です。
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-3 py-2 font-medium">Scope</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {API_SCOPES.map((s) => (
                  <tr key={s.scope} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">{s.scope}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {s.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TOC */}
        <nav className="mb-8 border border-gray-200 rounded-lg p-4 bg-white">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Endpoints
          </p>
          <ul className="space-y-1">
            {ENDPOINT_GROUPS.map((g) => (
              <li key={g.id}>
                <a
                  href={`#${g.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {g.title}
                </a>
                <span className="text-xs text-gray-400 ml-2">
                  {g.endpoints.length} endpoints
                </span>
              </li>
            ))}
          </ul>
        </nav>

        {/* Endpoint groups */}
        <div className="space-y-10">
          {ENDPOINT_GROUPS.map((group) => (
            <EndpointSection key={group.id} group={group} />
          ))}
        </div>

        {/* Error Responses */}
        <section className="mt-10 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Error Responses
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            エラー時は以下のJSON形式でレスポンスが返ります。
          </p>
          <CodeBlock code='{ "message": "エラー内容" }' />
          <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["400", "リクエストパラメータが不正"],
                  ["401", "認証エラー（APIキー未設定・無効）"],
                  ["403", "スコープ不足"],
                  ["404", "リソースが存在しない"],
                  ["429", "レートリミット超過"],
                  ["500", "サーバーエラー"],
                ].map(([code, desc]) => (
                  <tr key={code} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">
                      {code}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
