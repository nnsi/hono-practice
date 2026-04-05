import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { adminClient } from "../../utils/apiClient";

type UserDangerZoneProps = {
  userId: string;
  loginId: string;
  onDeleted: () => void;
};

export function UserDangerZone({
  userId,
  loginId,
  onDeleted,
}: UserDangerZoneProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const mutation = useMutation({
    mutationFn: async (body: { loginIdConfirmation: string }) => {
      const res = await adminClient.admin.users[":id"].$delete({
        param: { id: userId },
        json: body,
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onDeleted();
    },
  });

  function handleCancel() {
    setIsOpen(false);
    setConfirmation("");
    mutation.reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ loginIdConfirmation: confirmation });
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={18} className="text-red-700" />
        <h2 className="font-bold text-red-700">Danger Zone</h2>
      </div>
      <p className="mb-4 text-sm text-red-700">
        このユーザーと紐づく全データ（activity、task、サブスク、apiキー等）を物理削除します。この操作は取り消せません。
      </p>

      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          ユーザーを物理削除
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-red-700">
            確認のため、削除対象ユーザーのログインID（
            <span className="font-mono font-semibold">{loginId}</span>
            ）を入力してください
          </p>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="ログインID"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
            autoComplete="off"
          />
          {mutation.isError && (
            <p className="text-sm text-red-600">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "エラーが発生しました"}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={confirmation !== loginId || mutation.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {mutation.isPending ? "削除中..." : "削除を実行"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
