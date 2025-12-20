import type React from "react";

import { ActivityDateHeader } from "@components/activity/ActivityDateHeader";
import { Card, CardContent } from "@components/ui";
import { useDailyPage } from "@frontend/hooks/feature/daily/useDailyPage";
import { UpdateIcon } from "@radix-ui/react-icons";

import { ActivityLogEditDialog } from "./ActivityLogEditDialog";
import { DailyActivityLogCreateDialog } from "./DailyActivityLogCreateDialog";
import { TaskList } from "./TaskList";

export const ActivityDailyPage: React.FC = () => {
  const {
    date,
    setDate,
    editDialogOpen,
    editTargetLog,
    createDialogOpen,
    setCreateDialogOpen,
    isLoading,
    tasks,
    isTasksLoading,
    mergedActivityLogs,
    isOfflineData,
    handleActivityLogClick,
    handleActivityLogEditDialogChange,
  } = useDailyPage();

  return (
    <>
      <div>
        <ActivityDateHeader date={date} setDate={setDate} />
        <hr className="my-6" />
        <div className="flex-1 flex flex-col gap-4 px-4 mt-2">
          {mergedActivityLogs && mergedActivityLogs.length > 0 ? (
            mergedActivityLogs.map((log) => (
              <Card
                key={log.id}
                onClick={() => handleActivityLogClick(log)}
                className={`cursor-pointer shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 h-20 ${
                  isOfflineData(log) ? "opacity-70 border-orange-200" : ""
                }`}
              >
                <CardContent className="flex items-center gap-4 p-0 px-4 h-full">
                  <span className="flex items-center justify-center w-10 h-10 text-3xl">
                    {log.activity.iconType === "upload" &&
                    log.activity.iconThumbnailUrl ? (
                      <img
                        src={log.activity.iconThumbnailUrl}
                        alt={log.activity.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      log.activity.emoji
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="text-lg font-semibold flex items-center gap-2">
                      {log.activity.name}
                      {log.activityKind?.name && (
                        <> [{log.activityKind.name}]</>
                      )}
                      {isOfflineData(log) && (
                        <UpdateIcon className="w-4 h-4 text-orange-500 animate-spin" />
                      )}
                    </div>
                    <div className="text-muted-foreground text-base">
                      {log.quantity !== null
                        ? `${log.quantity}${log.activity.quantityUnit}`
                        : "-"}
                    </div>
                    {log.memo && (
                      <div className="text-xs text-gray-500 mt-1">
                        {log.memo}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              {isLoading ? "Loading..." : "アクティビティはありません"}
            </div>
          )}
        </div>
        <hr className="my-6" />
        <TaskList
          tasks={tasks ?? undefined}
          isTasksLoading={isTasksLoading}
          date={date}
        />
      </div>
      <ActivityLogEditDialog
        open={editDialogOpen}
        onOpenChange={handleActivityLogEditDialogChange}
        log={editTargetLog}
      />
      <DailyActivityLogCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        date={date}
        onSuccess={() => {
          // 必要に応じてリフレッシュ処理を追加
        }}
      />
    </>
  );
};
