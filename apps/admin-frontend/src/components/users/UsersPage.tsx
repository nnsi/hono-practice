import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

import { adminClient } from "../../utils/apiClient";

const PAGE_SIZE = 20;

export function UsersPage() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page],
    queryFn: async () => {
      const res = await adminClient.admin.users.$get({
        query: {
          limit: String(PAGE_SIZE),
          offset: String(page * PAGE_SIZE),
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">ユーザー一覧</h2>
        <span className="text-sm text-gray-500">
          {data ? `${data.total}件` : ""}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">名前</th>
              <th className="px-4 py-3 font-medium text-gray-600">
                ログインID
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">登録日</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <LoadingRows />
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  ユーザーがいません
                </td>
              </tr>
            ) : (
              data?.items.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">
                    {user.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {user.loginId}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {dayjs(user.createdAt).format("YYYY/MM/DD HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/users/$id"
                      params={{ id: user.id }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-30"
            >
              <ChevronLeft size={16} /> 前へ
            </button>
            <span className="text-xs text-gray-500">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-30"
            >
              次へ <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const skeletonKeys = ["a", "b", "c", "d", "e"];

function LoadingRows() {
  return (
    <>
      {skeletonKeys.map((k) => (
        <tr key={k}>
          <td className="px-4 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3" />
        </tr>
      ))}
    </>
  );
}
