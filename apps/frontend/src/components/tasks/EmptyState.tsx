import { PlusCircledIcon } from "@radix-ui/react-icons";

import { Card, CardContent } from "@components/ui";

type EmptyStateProps = {
  onCreateClick: () => void;
};

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card
        className="cursor-pointer shadow-sm rounded-lg border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md hover:border-gray-400 transition-all duration-200 group w-full max-w-md"
        onClick={onCreateClick}
      >
        <CardContent className="flex flex-col items-center justify-center gap-3 p-8">
          <PlusCircledIcon className="w-12 h-12 text-gray-400 group-hover:text-gray-600" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-600 group-hover:text-gray-800">
              タスクがありません
            </p>
            <p className="text-sm text-gray-500 group-hover:text-gray-700 mt-1">
              ここをクリックして最初のタスクを追加
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
