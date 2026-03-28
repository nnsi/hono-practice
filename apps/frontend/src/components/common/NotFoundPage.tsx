import { useTranslation } from "@packages/i18n";
import { Link } from "@tanstack/react-router";
import { FileQuestion, Home } from "lucide-react";

import { ActikoLogo } from "./ActikoLogo";

export function NotFoundPage() {
  const { t } = useTranslation("common");

  return (
    <div className="min-h-svh flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <ActikoLogo className="w-48 mx-auto mb-8" />
        <FileQuestion className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-700 mb-2">
          {t("common.notFound")}
        </h1>
        <p className="text-gray-400 mb-8">{t("common.notFoundDescription")}</p>
        <Link
          to="/actiko"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          {t("common.backHome")}
        </Link>
      </div>
    </div>
  );
}
