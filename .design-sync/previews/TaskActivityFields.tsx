import { useState } from "react";

import { TaskActivityFields } from "actiko-frontend";

// TaskActivityFields is a form fragment (activity select + kind chips + quantity)
// used inside the task create/edit dialog. The activity options and kind chips
// are loaded from local Dexie, which is empty in preview — so the select shows
// the "なし" option and the dependent kind/quantity fields stay hidden. We render
// it controlled inside a sized form column.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 320 }}
      className="p-4 bg-white rounded-2xl shadow-soft border border-gray-200/50 space-y-4"
    >
      {children}
    </div>
  );
}

export function Empty() {
  const [activityId, setActivityId] = useState<string | null>(null);
  const [activityKindId, setActivityKindId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  return (
    <Frame>
      <TaskActivityFields
        activityId={activityId}
        setActivityId={setActivityId}
        activityKindId={activityKindId}
        setActivityKindId={setActivityKindId}
        quantity={quantity}
        setQuantity={setQuantity}
      />
    </Frame>
  );
}

export function Disabled() {
  const [activityId, setActivityId] = useState<string | null>(null);
  const [activityKindId, setActivityKindId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  return (
    <Frame>
      <TaskActivityFields
        activityId={activityId}
        setActivityId={setActivityId}
        activityKindId={activityKindId}
        setActivityKindId={setActivityKindId}
        quantity={quantity}
        setQuantity={setQuantity}
        disabled
      />
    </Frame>
  );
}
