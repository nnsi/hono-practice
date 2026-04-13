import { useTranslation } from "@packages/i18n";

import type { DexieActivity } from "../../db/schema";
import { FormInput } from "../common/FormInput";
import { NoteActivitySelect } from "./NoteActivitySelect";

type Props = {
  title: string;
  setTitle: (v: string) => void;
  activityId: string | null;
  setActivityId: (v: string | null) => void;
  activities: DexieActivity[];
  isOpen: boolean;
};

export function NoteSettingsPanel({
  title,
  setTitle,
  activityId,
  setActivityId,
  activities,
  isOpen,
}: Props) {
  const { t } = useTranslation("note");

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{ maxHeight: isOpen ? "500px" : "0px" }}
    >
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("create.label.title")}
          </label>
          <FormInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("create.placeholder.title")}
          />
        </div>
        <NoteActivitySelect
          activityId={activityId}
          activities={activities}
          onChange={setActivityId}
        />
      </div>
    </div>
  );
}
