import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";

import { adminClient } from "../../utils/apiClient";
import { SubscriptionSection } from "./SubscriptionSection";

export function UserDetailPage() {
  const { id } = useParams({ from: "/users_/$id" });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: async () => {
      const res = await adminClient.admin.users[":id"].$get({
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

  if (isError) {
    return (
      <div className="text-center text-red-500">データの取得に失敗しました</div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500">ユーザーが見つかりません</div>
    );
  }

  return (
    <div>
      <Link
        to="/users"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        ユーザー一覧に戻る
      </Link>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-xl font-bold text-gray-900">ユーザー詳細</h2>
        <dl className="space-y-4">
          <div>
            <dt className="mb-1 text-sm font-medium text-gray-500">名前</dt>
            <dd className="text-sm text-gray-900">{data.user.name ?? "-"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-sm font-medium text-gray-500">
              ログインID
            </dt>
            <dd className="font-mono text-xs text-gray-900">
              {data.user.loginId}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-sm font-medium text-gray-500">登録日</dt>
            <dd className="text-sm text-gray-900">
              {dayjs(data.user.createdAt).format("YYYY/MM/DD HH:mm:ss")}
            </dd>
          </div>
        </dl>
      </div>

      <SubscriptionSection
        subscription={data.subscription}
        userId={data.user.id}
      />
    </div>
  );
}
