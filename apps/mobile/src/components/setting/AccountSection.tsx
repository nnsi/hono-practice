import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Database, Download, Trash2, Upload } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { clearLocalData } from "../../sync/initialSync";
import { CSVExportModal } from "../csv/CSVExportModal";
import { CSVImportModal } from "../csv/CSVImportModal";
import {
  Divider,
  InlineConfirm,
  Section,
  type ShadowStyle,
} from "./SettingsParts";

export function DataManagementSection({ shadow }: { shadow: ShadowStyle }) {
  const { t } = useTranslation("settings");
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearData = async () => {
    await clearLocalData();
    setShowClearConfirm(false);
  };

  return (
    <>
      <Section icon={Database} label={t("dataManagement")} shadow={shadow}>
        <TouchableOpacity
          className="flex-row items-center px-4 py-3"
          onPress={() => setShowImport(true)}
          accessibilityRole="button"
          accessibilityLabel={t("importCSV")}
        >
          <Upload size={18} color="#3b82f6" />
          <Text className="ml-3 text-base text-blue-600 dark:text-blue-400">
            {t("importCSV")}
          </Text>
        </TouchableOpacity>
        <Divider />
        <TouchableOpacity
          className="flex-row items-center px-4 py-3"
          onPress={() => setShowExport(true)}
          accessibilityRole="button"
          accessibilityLabel={t("exportCSV")}
        >
          <Download size={18} color="#3b82f6" />
          <Text className="ml-3 text-base text-blue-600 dark:text-blue-400">
            {t("exportCSV")}
          </Text>
        </TouchableOpacity>
        <Divider />
        <View className="px-4 py-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {t("localStorageNote")}
          </Text>
        </View>
        <Divider />
        {!showClearConfirm ? (
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => setShowClearConfirm(true)}
            accessibilityRole="button"
            accessibilityLabel={t("deleteLocalData")}
          >
            <Trash2 size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500 dark:text-red-400">
              {t("deleteLocalData")}
            </Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm
            message={t("deleteLocalDataConfirm")}
            confirmLabel={t("deleteLocalDataButton")}
            onConfirm={handleClearData}
            onCancel={() => setShowClearConfirm(false)}
          />
        )}
      </Section>

      <CSVImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
      />
      <CSVExportModal
        visible={showExport}
        onClose={() => setShowExport(false)}
      />
    </>
  );
}
