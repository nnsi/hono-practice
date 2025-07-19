import type React from "react";

import { Card, CardContent } from "@frontend/components/ui";

type ActivityCardProps = {
  children: React.ReactNode;
  onClick: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  isDone?: boolean;
  isDashed?: boolean;
};

export function ActivityCard({
  children,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  isDone,
  isDashed,
}: ActivityCardProps) {
  return (
    <Card
      className={`flex items-center justify-center h-full min-h-[140px] shadow-sm rounded-lg cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 select-none group ${
        isDone ? "bg-green-50" : ""
      } ${
        isDashed
          ? "border-2 border-dashed border-gray-300 bg-white hover:border-gray-400"
          : ""
      }`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <CardContent className="flex flex-col items-center justify-center p-6">
        {children}
      </CardContent>
    </Card>
  );
}
