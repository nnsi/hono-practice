import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

import { adminGet } from "../../utils/apiClient";

type ContactListItem = {
  id: string;
  email: string;
  category: string | null;
  body: string;
  userId: string | null;
  createdAt: string;
};

type ContactsResponse = {
  items: ContactListItem[];
  total: number;
};

const PAGE_SIZE = 20;

export function ContactsPage() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "contacts", page],
    queryFn: () =>
      adminGet<ContactsResponse>(
        `/admin/contacts?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
      ),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">問い合わせ一覧</h2>
        <span className="text-sm text-gray-500">
          {data ? `${data.total}件` : ""}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">
                メールアドレス
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">カテゴリ</th>
              <th className="px-4 py-3 font-medium text-gray-600">内容</th>
              <th className="px-4 py-3 font-medium text-gray-600">受信日</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <LoadingRows />
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  問い合わせがありません
                </td>
              </tr>
            ) : (
              data?.items.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{contact.email}</td>
                  <td className="px-4 py-3">
                    {contact.category ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {contact.category}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-500">
                    {contact.body}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {dayjs(contact.createdAt).format("YYYY/MM/DD HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/contacts/$id"
                      params={{ id: contact.id }}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
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
