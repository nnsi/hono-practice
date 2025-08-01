import { useState } from "react";

import { useDeleteGoal, useUpdateGoal } from "@frontend/hooks/api";
import { useAppSettings } from "@frontend/hooks/feature/setting/useAppSettings";
import { calculateDebtBalance } from "@packages/frontend-shared";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import type { GoalResponse } from "@dtos/response";

type EditFormData = {
  dailyTargetQuantity: number;
};

const getProgressColor = (statusInfo: { bgColor: string }) => {
  const colorMap: Record<string, string> = {
    "bg-green-50": "rgba(34, 197, 94, 0.2)",
    "bg-red-50": "rgba(239, 68, 68, 0.2)",
    "bg-red-100": "rgba(239, 68, 68, 0.3)",
    "bg-orange-50": "rgba(251, 146, 60, 0.2)",
    "bg-gray-50": "rgba(156, 163, 175, 0.2)",
  };
  return colorMap[statusInfo.bgColor] || "rgba(156, 163, 175, 0.2)";
};

export const useNewGoalCard = (
  goal: GoalResponse,
  onEditEnd: () => void,
  isPast = false,
) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showLogCreateDialog, setShowLogCreateDialog] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();
  const queryClient = useQueryClient();
  const { settings } = useAppSettings();

  const form = useForm<EditFormData>({
    defaultValues: {
      dailyTargetQuantity: goal.dailyTargetQuantity,
    },
  });

  const handleUpdate = (data: EditFormData) => {
    const quantity = data.dailyTargetQuantity;
    if (!quantity || quantity <= 0) {
      return;
    }

    updateGoal.mutate(
      {
        id: goal.id,
        data: { dailyTargetQuantity: Number(quantity) },
      },
      {
        onSuccess: () => {
          onEditEnd();
        },
      },
    );
  };

  const handleDelete = () => {
    if (confirm("このゴールを削除しますか？")) {
      deleteGoal.mutate(goal.id);
    }
  };

  const statusInfo = calculateDebtBalance(
    goal.currentBalance,
    goal.dailyTargetQuantity,
  );
  const progressPercentage =
    goal.totalTarget > 0
      ? Math.min((goal.totalActual / goal.totalTarget) * 100, 100)
      : 0;

  const handleLogCreateSuccess = async () => {
    // 目標データを再取得
    await queryClient.invalidateQueries({ queryKey: ["goals"] });
    // アニメーションを開始
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1500);
  };

  // 日次目標数量の変更ハンドラ
  const handleTargetQuantityChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldOnChange: (value: string | number) => void,
  ) => {
    const value = e.target.value;
    fieldOnChange(value === "" ? "" : Number(value));
  };

  // 削除ボタンのクリックハンドラ（編集モード）
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDelete();
  };

  // カードのクリックハンドラ
  const handleCardClick = () => {
    setShowDetailModal(true);
  };

  // カードのキーダウンハンドラ
  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setShowDetailModal(true);
    }
  };

  // 活動量登録ボタンのクリックハンドラ
  const handleLogCreateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLogCreateDialog(true);
  };

  // 編集ボタンのクリックハンドラ
  const handleEditClick = (e: React.MouseEvent, onEditStart: () => void) => {
    e.stopPropagation();
    onEditStart();
  };

  // 削除ボタンのクリックハンドラ（過去の目標）
  const handlePastGoalDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleDelete();
  };

  const isActive = !isPast;
  const progressColor = getProgressColor(statusInfo);

  return {
    // State
    showDetailModal,
    setShowDetailModal,
    showLogCreateDialog,
    setShowLogCreateDialog,
    isAnimating,

    // Form
    form,

    // Computed
    statusInfo,
    progressPercentage,
    progressColor,
    isActive,
    settings,

    // Mutations
    updateGoal,
    deleteGoal,

    // Handlers
    handleUpdate,
    handleDelete,
    handleLogCreateSuccess,
    handleTargetQuantityChange,
    handleDeleteClick,
    handleCardClick,
    handleCardKeyDown,
    handleLogCreateClick,
    handleEditClick,
    handlePastGoalDeleteClick,
  };
};
