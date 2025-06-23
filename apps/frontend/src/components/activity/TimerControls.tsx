import { Pause, Play, RotateCcw } from "lucide-react";

import { Button } from "@components/ui";

type TimerControlsProps = {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  showReset?: boolean;
};

export const TimerControls = ({
  isRunning,
  onStart,
  onStop,
  onReset,
  showReset = true,
}: TimerControlsProps) => {
  return (
    <div className="flex gap-2 justify-center">
      <Button
        type="button"
        onClick={isRunning ? onStop : onStart}
        variant={isRunning ? "destructive" : "default"}
        size="lg"
        className="flex items-center gap-2"
      >
        {isRunning ? (
          <>
            <Pause className="h-4 w-4" />
            停止
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            開始
          </>
        )}
      </Button>
      {showReset && (
        <Button
          type="button"
          onClick={onReset}
          variant="outline"
          size="lg"
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          リセット
        </Button>
      )}
    </div>
  );
};