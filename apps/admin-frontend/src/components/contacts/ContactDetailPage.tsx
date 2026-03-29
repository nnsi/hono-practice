import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";

import { adminClient } from "../../utils/apiClient";

export function ContactDetailPage() {
  const { id } = useParams({ from: "/contacts_/$id" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "contacts", id],
    queryFn: async () => {
      const res = await adminClient.admin.contacts[":id"].$get({
        param: { id },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500">
        問い合わせが見つかりません
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/contacts"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        一覧に戻る
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-xl font-bold text-gray-900">問い合わせ詳細</h2>

        <dl className="space-y-4">
          <Field label="メールアドレス" value={data.email} />
          <Field label="カテゴリ" value={data.category ?? "-"} />
          <Field
            label="受信日"
            value={dayjs(data.createdAt).format("YYYY/MM/DD HH:mm:ss")}
          />
          <Field label="IPアドレス" value={data.ipAddress} mono />
          <Field label="ユーザーID" value={data.userId ?? "未ログイン"} mono />
          <div>
            <dt className="mb-1 text-sm font-medium text-gray-500">内容</dt>
            <dd className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-900">
              {data.body}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="mb-1 text-sm font-medium text-gray-500">{label}</dt>
      <dd
        className={`text-sm text-gray-900 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
