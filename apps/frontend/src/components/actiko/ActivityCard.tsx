import { useEffect, useState } from "react";

import { useTranslation } from "@packages/i18n";
import { ChevronUp, Pencil, Undo2 } from "lucide-react";

import { activityRepository } from "../../db/activityRepository";
import type { DexieActivity, DexieActivityIconBlob } from "../../db/schema";
import { LogFormBody } from "../common/LogFormBody";

export function ActivityCard({
  activity,
  isDone,
  iconBlob,
  date,
  expanded,
  undoAvailable,
  onClick,
  onEdit,
  onCollapse,
  onSaved,
  onUndo,
}: {
  activity: DexieActivity;
  isDone: boolean;
  iconBlob?: DexieActivityIconBlob;
  date: string;
  /** カードをその場で展開し、記録モードの UI を出しているか */
  expanded: boolean;
  /** 直前の即時記録を取り消せる猶予中か */
  undoAvailable: boolean;
  onClick: () => void;
  onEdit: () => void;
  onCollapse: () => void;
  onSaved: () => void;
  onUndo: () => void;
}) {
  const { t } = useTranslation("actiko");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (activity.iconType !== "upload") return;
    if (iconBlob) return;
    const url = activity.iconThumbnailUrl || activity.iconUrl;
    if (!url) return;
    activityRepository.cacheRemoteIcon(activity.id, url);
  }, [
    activity.id,
    activity.iconType,
    activity.iconUrl,
    activity.iconThumbnailUrl,
    iconBlob,
  ]);

  const renderIcon = (sizeClass: string) => {
    if (activity.iconType === "upload" && !imageError) {
      if (iconBlob) {
        return (
          <img
            src={`data:${iconBlob.mimeType};base64,${iconBlob.base64}`}
            alt=""
            className={`${sizeClass} rounded-lg object-cover`}
            onError={() => setImageError(true)}
          />
        );
      }
      if (activity.iconThumbnailUrl || activity.iconUrl) {
        return (
          <img
            src={activity.iconThumbnailUrl || activity.iconUrl || ""}
            alt=""
            className={`${sizeClass} rounded-lg object-cover`}
            onError={() => setImageError(true)}
          />
        );
      }
    }
    return <span>{activity.emoji || "📝"}</span>;
  };

  // 展開・折りたたみでルート要素を差し替えない（grid の stagger アニメーションが再生されるのを避ける）
  return (
    <div
      className={`relative group ${expanded ? "col-span-2" : ""}`}
      data-activity-card={activity.id}
      data-expanded={expanded ? "true" : undefined}
    >
      {expanded ? (
        <div
          className={`rounded-2xl p-4 shadow-lifted border ${
            isDone ? "activity-done" : "bg-white border-gray-200/60"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={onCollapse}
              className="flex items-center gap-2 min-w-0 text-left"
            >
              <span className="text-2xl shrink-0">{renderIcon("w-7 h-7")}</span>
              <span className="text-base font-bold text-gray-800 truncate">
                {activity.name}
              </span>
              {activity.quantityUnit && (
                <span className="text-xs text-gray-400 shrink-0">
                  {activity.quantityUnit}
                </span>
              )}
            </button>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={onEdit}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label={t("editTitle")}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={onCollapse}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label={t("collapse")}
              >
                <ChevronUp size={18} />
              </button>
            </div>
          </div>
          <div className="animate-fade-in">
            <LogFormBody activity={activity} date={date} onDone={onSaved} />
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onClick}
            className={`
              w-full flex flex-col items-center justify-center p-4 rounded-2xl
              min-h-[120px] select-none transition-all duration-200
              active:scale-[0.96] press-effect
              ${
                isDone
                  ? "activity-done shadow-soft"
                  : "bg-white shadow-soft hover:shadow-lifted border border-gray-200/50"
              }
            `}
          >
            <span className="text-3xl mb-2">{renderIcon("w-8 h-8")}</span>
            <span className="text-sm font-medium text-center leading-tight text-gray-800">
              {activity.name}
            </span>
            {activity.quantityUnit && (
              <span className="text-xs text-gray-400 mt-1">
                {activity.quantityUnit}
              </span>
            )}
          </button>
          {/* Edit button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="absolute top-1.5 right-1.5 p-2 rounded-full bg-white/80 text-gray-400 active:bg-gray-200 transition-colors"
            aria-label={t("editTitle")}
          >
            <Pencil size={12} />
          </button>
          {/* 即時記録の取り消し（猶予中のみ） */}
          {undoAvailable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUndo();
              }}
              className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900 text-white text-[11px] font-medium shadow-lg animate-fade-in"
            >
              <Undo2 size={12} />
              {t("undo")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
