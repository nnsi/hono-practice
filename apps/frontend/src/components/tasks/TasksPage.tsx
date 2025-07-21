import { TaskCreateDialog } from "@frontend/components/tasks/TaskCreateDialog";
import { useTasksPage } from "@frontend/hooks/feature/tasks/useTasksPage";
import { PlusCircledIcon } from "@radix-ui/react-icons";

import { Card, CardContent } from "@components/ui";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";

import { EmptyState } from "./EmptyState";
import { TaskGroup } from "./TaskGroup";

export function TasksPage() {
  const {
    showCompleted,
    setShowCompleted,
    showFuture,
    setShowFuture,
    createDialogOpen,
    setCreateDialogOpen,
    activeTab,
    setActiveTab,
    isTasksLoading,
    archivedTasks,
    isArchivedTasksLoading,
    groupedTasks,
    hasAnyTasks,
    hasAnyArchivedTasks,
  } = useTasksPage();

  return (
    <div>
      <hr className="mt-12 mb-6" />
      <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "active" | "archived")
          }
        >
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6">
            <TabsTrigger value="active">アクティブ</TabsTrigger>
            <TabsTrigger value="archived">アーカイブ済み</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {!hasAnyTasks && (
              <EmptyState onCreateClick={() => setCreateDialogOpen(true)} />
            )}
            <div className="space-y-6">
              {/* 期限切れ */}
              {groupedTasks.overdue.length > 0 && (
                <TaskGroup
                  title="期限切れ"
                  tasks={groupedTasks.overdue}
                  isLoading={isTasksLoading}
                  titleColor="text-red-600"
                  highlight
                />
              )}

              {/* 今日締切 */}
              {groupedTasks.dueToday.length > 0 && (
                <TaskGroup
                  title="今日締切"
                  tasks={groupedTasks.dueToday}
                  isLoading={isTasksLoading}
                  titleColor="text-orange-600"
                />
              )}

              {/* 今日開始 */}
              {groupedTasks.startingToday.length > 0 && (
                <TaskGroup
                  title="今日開始"
                  tasks={groupedTasks.startingToday}
                  isLoading={isTasksLoading}
                  titleColor="text-blue-600"
                />
              )}

              {/* 進行中 */}
              {groupedTasks.inProgress.length > 0 && (
                <TaskGroup
                  title="進行中"
                  tasks={groupedTasks.inProgress}
                  isLoading={isTasksLoading}
                  titleColor="text-green-600"
                />
              )}

              {/* 今週締切 */}
              {groupedTasks.dueThisWeek.length > 0 && (
                <TaskGroup
                  title="今週締切"
                  tasks={groupedTasks.dueThisWeek}
                  isLoading={isTasksLoading}
                />
              )}

              {/* 未来のタスク */}
              {(groupedTasks.notStarted.length > 0 ||
                groupedTasks.future.length > 0) && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowFuture(!showFuture)}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    {showFuture
                      ? "未来のタスクを隠す"
                      : `未来のタスク (${groupedTasks.notStarted.length + groupedTasks.future.length})`}
                  </button>
                  {showFuture && (
                    <>
                      {groupedTasks.notStarted.length > 0 && (
                        <TaskGroup
                          title="未開始"
                          tasks={groupedTasks.notStarted}
                          isLoading={isTasksLoading}
                          titleColor="text-purple-600"
                        />
                      )}
                      {groupedTasks.future.length > 0 && (
                        <TaskGroup
                          title="来週以降"
                          tasks={groupedTasks.future}
                          isLoading={isTasksLoading}
                          titleColor="text-indigo-600"
                        />
                      )}
                    </>
                  )}
                </>
              )}

              {/* 完了済み */}
              {groupedTasks.completed.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    {showCompleted
                      ? "完了済みを隠す"
                      : `完了済み (${groupedTasks.completed.length})`}
                  </button>
                  {showCompleted && (
                    <TaskGroup
                      title="完了済み"
                      tasks={groupedTasks.completed}
                      isLoading={isTasksLoading}
                      completed
                    />
                  )}
                </>
              )}

              {/* 新規タスク追加ボタン */}
              <Card
                onClick={() => setCreateDialogOpen(true)}
                className="w-full cursor-pointer shadow-sm rounded-lg border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md hover:border-gray-400 transition-all duration-200 group"
              >
                <CardContent className="flex items-center justify-center gap-2 py-6">
                  <PlusCircledIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  <span className="text-sm text-gray-500 group-hover:text-gray-700">
                    新規タスクを追加
                  </span>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="archived">
            {!hasAnyArchivedTasks && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  アーカイブ済みのタスクはありません
                </p>
              </div>
            )}
            {archivedTasks && archivedTasks.length > 0 && (
              <div className="space-y-6">
                <TaskGroup
                  title="アーカイブ済み"
                  tasks={archivedTasks}
                  isLoading={isArchivedTasksLoading}
                  archived
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => setCreateDialogOpen(false)}
      />
    </div>
  );
}

export default TasksPage;
