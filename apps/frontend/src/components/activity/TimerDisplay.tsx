type TimerDisplayProps = {
  time: string;
  isRunning: boolean;
};

export const TimerDisplay = ({ time, isRunning }: TimerDisplayProps) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-4xl font-mono font-bold tabular-nums">{time}</div>
      {isRunning && (
        <div className="text-sm text-muted-foreground mt-1">計測中...</div>
      )}
    </div>
  );
};
