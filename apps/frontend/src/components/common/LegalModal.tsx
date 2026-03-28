import type { LegalType } from "@packages/frontend-shared/legal";
import { getLegalContent } from "@packages/frontend-shared/legal";
import { useTranslation } from "@packages/i18n";
import { X } from "lucide-react";

import { ModalOverlay } from "./ModalOverlay";

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "";

type LegalModalProps = {
  type: LegalType;
  onClose: () => void;
};

export function LegalModal({ type, onClose }: LegalModalProps) {
  const { i18n } = useTranslation();
  const { title, sections } = getLegalContent(type, i18n.language, {
    contactEmail: CONTACT_EMAIL,
  });

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-sm">{section.title}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ModalOverlay>
  );
}
