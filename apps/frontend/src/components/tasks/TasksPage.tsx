import { TasksActiveSection } from "./TasksActiveSection";
import { TasksArchivedSection } from "./TasksArchivedSection";
import { TasksDialogs } from "./TasksDialogs";
import { TasksTabs } from "./TasksTabs";
import { useTasksPage } from "./useTasksPage";

export function TasksPage() {
  const {
    activeTab,
    setActiveTab,
    showCompleted,
    setShowCompleted,
    showFuture,
    setShowFuture,
    tasks,
    archivedTasks,
    groupedTasks,
    completedCount,
    futureCount,
    hasAnyTasks,
    createDialogOpen,
    setCreateDialogOpen,
    editingTask,
    setEditingTask,
    deleteConfirmId,
    setDeleteConfirmId,
    handleToggleDone,
    handleDelete,
    handleArchive,
    handleMoveToToday,
    handleCreateSuccess,
    handleEditSuccess,
  } = useTasksPage();

  const deleteTaskTitle =
    [...tasks, ...archivedTasks].find((task) => task.id === deleteConfirmId)
      ?.title ?? "";

  return (
    <div className="bg-white min-h-full">
      <TasksTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="p-4">
        {activeTab === "active" && (
          <TasksActiveSection
            groupedTasks={groupedTasks}
            futureCount={futureCount}
            completedCount={completedCount}
            hasAnyTasks={hasAnyTasks}
            showFuture={showFuture}
            showCompleted={showCompleted}
            onToggleFuture={setShowFuture}
            onToggleCompleted={setShowCompleted}
            onOpenCreate={() => setCreateDialogOpen(true)}
            onToggleDone={handleToggleDone}
            onEdit={setEditingTask}
            onDelete={setDeleteConfirmId}
            onArchive={handleArchive}
            onMoveToToday={handleMoveToToday}
          />
        )}

        {activeTab === "archived" && (
          <TasksArchivedSection
            archivedTasks={archivedTasks}
            onToggleDone={handleToggleDone}
            onEdit={setEditingTask}
            onDelete={setDeleteConfirmId}
            onArchive={handleArchive}
            onMoveToToday={handleMoveToToday}
          />
        )}
      </div>

      <TasksDialogs
        createDialogOpen={createDialogOpen}
        onCloseCreate={() => setCreateDialogOpen(false)}
        onCreateSuccess={handleCreateSuccess}
        editingTask={editingTask}
        onCloseEdit={() => setEditingTask(null)}
        onEditSuccess={handleEditSuccess}
        onDeleteFromEdit={(id) => {
          setEditingTask(null);
          setDeleteConfirmId(id);
        }}
        deleteConfirmId={deleteConfirmId}
        deleteTaskTitle={deleteTaskTitle}
        onConfirmDelete={handleDelete}
        onCancelDelete={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
