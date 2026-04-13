export type CSVImportStep = "file" | "preview";

export function shouldShowCSVPreview(
  step: CSVImportStep,
  parsedRowsLength: number,
  successCount: number | null,
): boolean {
  return step === "preview" && parsedRowsLength > 0 && successCount === null;
}
