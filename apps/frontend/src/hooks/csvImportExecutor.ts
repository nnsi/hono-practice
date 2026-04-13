import { buildDedupKey, buildDedupSet } from "@packages/domain/csv/csvDedup";

import {
  type ImportProgress,
  type ValidatedActivityLog,
  createEmptyImportProgress,
} from "./csvImportUtils";

type Translate = (key: string) => string;

type ImportExecutionOptions = {
  logs: ValidatedActivityLog[];
  t: Translate;
  onProgress: (progress: ImportProgress) => void;
  activityRepository: {
    getAllActivities: () => Promise<{ id: string; name: string }[]>;
    getAllActivityKinds: () => Promise<
      { activityId: string; id: string; name: string }[]
    >;
    createActivity: (input: {
      name: string;
      quantityUnit: string;
      emoji: string;
      showCombinedStats: boolean;
    }) => Promise<{ id: string; name: string }>;
  };
  activityLogRepository: {
    createActivityLog: (input: {
      activityId: string;
      activityKindId: string | null;
      quantity: number;
      memo: string;
      date: string;
      time: string | null;
      taskId: string | null;
    }) => Promise<unknown>;
    getActivityLogsBetween: (
      startDate: string,
      endDate: string,
    ) => Promise<
      {
        date: string;
        activityId: string;
        quantity: number | null;
        memo: string;
      }[]
    >;
  };
  syncEngine: {
    syncAll: () => void;
  };
};

type ImportExecutionResult = {
  importSuccess: boolean;
  errorMessage: string | null;
  autoCloseDelayMs: number | null;
};

export async function importValidatedLogs({
  logs,
  t,
  onProgress,
  activityRepository,
  activityLogRepository,
  syncEngine,
}: ImportExecutionOptions): Promise<ImportExecutionResult> {
  const toImport = logs.filter((log) => log.errors.length === 0);
  if (toImport.length === 0) {
    return {
      importSuccess: false,
      errorMessage: t("noImportData"),
      autoCloseDelayMs: null,
    };
  }

  let progress = createEmptyImportProgress(toImport.length);
  onProgress(progress);

  try {
    const activities = await activityRepository.getAllActivities();
    const allKinds = await activityRepository.getAllActivityKinds();
    const createdActivityMap = await createMissingActivities(
      activityRepository,
      toImport,
      activities.map((activity) => ({ id: activity.id, name: activity.name })),
    );
    const dedupSet = await createDedupSet(activityLogRepository, toImport);

    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    for (let index = 0; index < toImport.length; index++) {
      const log = toImport[index];
      try {
        let activityId = log.activityId;
        if (!activityId) {
          activityId =
            createdActivityMap.get(log.activityName) ??
            activities.find((activity) => activity.name === log.activityName)
              ?.id;
        }
        if (!activityId) {
          failed++;
        } else {
          const activityKindId = resolveActivityKindId(
            allKinds,
            activityId,
            log.kindName,
          );
          const date = normalizeImportDate(log.date);
          const memo = log.memo ?? "";
          const dedupKey = buildDedupKey({
            date,
            activityId,
            quantity: log.quantity,
            memo,
          });

          if (dedupSet.has(dedupKey)) {
            skipped++;
          } else {
            await activityLogRepository.createActivityLog({
              activityId,
              activityKindId,
              quantity: log.quantity,
              memo,
              date,
              time: null,
              taskId: null,
            });
            dedupSet.add(dedupKey);
            succeeded++;
          }
        }
      } catch {
        failed++;
      }

      progress = {
        total: toImport.length,
        processed: index + 1,
        succeeded,
        skipped,
        failed,
      };
      onProgress(progress);
    }

    syncEngine.syncAll();

    const messages: string[] = [];
    if (progress.skipped > 0) {
      messages.push(`${progress.skipped}${t("skipDuplicate")}`);
    }
    if (progress.failed > 0) {
      messages.push(`${progress.failed}${t("importFailed")}`);
    }

    if (messages.length === 0) {
      return {
        importSuccess: true,
        errorMessage: null,
        autoCloseDelayMs: 1500,
      };
    }

    if (progress.failed === 0) {
      return {
        importSuccess: true,
        errorMessage: messages.join("、"),
        autoCloseDelayMs: 2500,
      };
    }

    return {
      importSuccess: false,
      errorMessage: messages.join("、"),
      autoCloseDelayMs: null,
    };
  } catch {
    return {
      importSuccess: false,
      errorMessage: t("importError"),
      autoCloseDelayMs: null,
    };
  }
}

async function createMissingActivities(
  activityRepository: ImportExecutionOptions["activityRepository"],
  logs: ValidatedActivityLog[],
  existingActivities: { id: string; name: string }[],
): Promise<Map<string, string>> {
  const newActivityNames = [
    ...new Set(
      logs
        .filter((log) => log.isNewActivity && log.activityName)
        .map((log) => log.activityName),
    ),
  ];

  const createdActivityMap = new Map<string, string>();
  for (const name of newActivityNames) {
    if (existingActivities.some((activity) => activity.name === name)) {
      continue;
    }
    const created = await activityRepository.createActivity({
      name,
      quantityUnit: "回",
      emoji: "📊",
      showCombinedStats: false,
    });
    createdActivityMap.set(name, created.id);
  }

  return createdActivityMap;
}

async function createDedupSet(
  activityLogRepository: ImportExecutionOptions["activityLogRepository"],
  logs: ValidatedActivityLog[],
) {
  const normalizedDates = logs.map((log) => normalizeImportDate(log.date));
  const minDate = normalizedDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = normalizedDates.reduce((a, b) => (a > b ? a : b));
  const existingLogs = await activityLogRepository.getActivityLogsBetween(
    minDate,
    maxDate,
  );
  return buildDedupSet(existingLogs);
}

function normalizeImportDate(date: string): string {
  return date.includes("T") ? date.split("T")[0] : date;
}

function resolveActivityKindId(
  allKinds: { activityId: string; id: string; name: string }[],
  activityId: string,
  kindName: string | undefined,
): string | null {
  if (!kindName) {
    return null;
  }

  const kind = allKinds.find(
    (item) => item.activityId === activityId && item.name === kindName,
  );
  return kind?.id ?? null;
}
