import { cn } from "@frontend/utils";

import type { GetActivityResponse } from "@dtos/response";

type ActivityIconProps = {
  activity: GetActivityResponse;
  size?: "small" | "medium" | "large";
  className?: string;
};

export const ActivityIcon: React.FC<ActivityIconProps> = ({
  activity,
  size = "medium",
  className,
}) => {
  const sizeClasses = {
    small: "w-6 h-6 text-lg",
    medium: "w-8 h-8 text-2xl",
    large: "w-12 h-12 text-3xl",
  };

  const sizeClass = sizeClasses[size];

  if (activity.iconType === "upload" && activity.iconThumbnailUrl) {
    return (
      <img
        src={activity.iconThumbnailUrl}
        alt={activity.name}
        className={cn(sizeClass, "object-cover rounded", className)}
      />
    );
  }

  return (
    <div
      className={cn(sizeClass, "flex items-center justify-center", className)}
    >
      <span>{activity.emoji}</span>
    </div>
  );
};
