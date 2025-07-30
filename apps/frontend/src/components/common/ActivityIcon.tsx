import { useState } from "react";

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    small: "w-6 h-6 text-lg",
    medium: "w-8 h-8 text-2xl",
    large: "w-12 h-12 text-3xl",
  };

  const spinnerSizeClasses = {
    small: "w-4 h-4",
    medium: "w-5 h-5",
    large: "w-6 h-6",
  };

  const sizeClass = sizeClasses[size];
  const spinnerSizeClass = spinnerSizeClasses[size];

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const showImage =
    activity.iconType === "upload" && activity.iconThumbnailUrl && !imageError;

  if (showImage) {
    return (
      <div className={cn(sizeClass, "relative", className)}>
        {!imageLoaded && (
          <div
            className={cn(
              sizeClass,
              "absolute inset-0 flex items-center justify-center bg-gray-100 rounded",
            )}
          >
            <div
              className={cn(
                spinnerSizeClass,
                "animate-spin rounded-full border-2 border-gray-300 border-t-gray-600",
              )}
            />
          </div>
        )}
        <img
          src={activity.iconThumbnailUrl ?? ""}
          alt=""
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            sizeClass,
            "object-cover rounded",
            !imageLoaded && "opacity-0",
          )}
        />
      </div>
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
