import type { GetActivityResponse } from "@dtos/response";

export const ActivityEditModal = ({
  open,
  onClose,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  activity: GetActivityResponse | null;
}) =>
  open ? (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded shadow">
        <h2 className="text-lg font-bold mb-4">Activity Edit Modal</h2>
        <p>（ここに編集UIを実装予定）{activity?.name}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          閉じる
        </button>
      </div>
    </div>
  ) : null;
