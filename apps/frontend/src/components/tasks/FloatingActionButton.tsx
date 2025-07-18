import { PlusIcon } from "@radix-ui/react-icons";

import { Button } from "@components/ui";

type FloatingActionButtonProps = {
  onClick: () => void;
};

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 sm:absolute sm:bottom-6 sm:right-6 z-50">
      <Button
        onClick={onClick}
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        size="icon"
      >
        <PlusIcon className="h-6 w-6" />
        <span className="sr-only">新規タスクを追加</span>
      </Button>
    </div>
  );
}
