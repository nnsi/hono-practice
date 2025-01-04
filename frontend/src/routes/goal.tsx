import { createFileRoute } from "@tanstack/react-router";

import { useDragHide } from "../hooks/useVerticalDragAndHide";

const GoalPage: React.FC = () => {
  const { targetRef, dragHandlers, styles } = useDragHide();

  return (
    <div>
      <div
        ref={targetRef}
        className={` bg-black text-white ${styles}`}
        {...dragHandlers}
      >
        menu
      </div>
      <h1>Hello "/goal"!</h1>
    </div>
  );
};

export const Route = createFileRoute("/goal")({
  component: GoalPage,
});
