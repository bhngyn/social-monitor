"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { useI18n } from "@/lib/i18n";

interface ExportReportDialogProps {
  setId: string;
  setName: string;
  open: boolean;
  onClose: () => void;
}

type ExportFormat = "pdf" | "zip" | "csv" | "json";

export function ExportReportDialog({
  setId,
  setName,
  open,
  onClose,
}: ExportReportDialogProps) {
  const { t, locale } = useI18n();

  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [exportLocale, setExportLocale] = useState<"en" | "es">(locale);
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeEngagement, setIncludeEngagement] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPdf = format === "pdf";
  const isPdfOrZip = format === "pdf" || format === "zip";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { format };
      if (isPdf) {
        body.locale = exportLocale;
        body.include_notes = includeNotes;
        body.include_engagement = includeEngagement;
      }
      if (isPdfOrZip) {
        body.include_screenshots = includeScreenshots;
        if (!isPdf) body.include_notes = includeNotes;
      }

      const res = await fetch(`/api/export/set/${setId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext =
        format === "pdf"
          ? "pdf"
          : format === "zip"
          ? "zip"
          : format === "csv"
          ? "csv"
          : "json";
      a.download = `${setName}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError(t("exportFailed"));
    } finally {
      setGenerating(false);
    }
  };

  const formats: { value: ExportFormat; label: string }[] = [
    { value: "pdf", label: t("formatPdfCase") },
    { value: "zip", label: t("formatZip") },
    { value: "csv", label: t("formatCsv") },
    { value: "json", label: t("formatJson") },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-lg">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              {t("exportReport")}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t("cancel")}
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Format */}
            <fieldset>
              <legend className="text-sm font-medium text-foreground mb-2">
                {t("exportFormat")}
              </legend>
              <div className="space-y-2">
                {formats.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="format"
                      value={value}
                      checked={format === value}
                      onChange={() => setFormat(value)}
                      className="accent-slate-900"
                    />
                    <span className="text-sm text-foreground">
                      {label}
                      {value === "pdf" && (
                        <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                          recommended
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Locale (PDF only) */}
            {isPdf && (
              <fieldset>
                <legend className="text-sm font-medium text-foreground mb-2">
                  {t("exportLocale")}
                </legend>
                <div className="flex gap-4">
                  {(
                    [
                      { value: "en", label: t("english") },
                      { value: "es", label: t("spanish2") },
                    ] as const
                  ).map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="exportLocale"
                        value={value}
                        checked={exportLocale === value}
                        onChange={() => setExportLocale(value)}
                        className="accent-slate-900"
                      />
                      <span className="text-sm text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Checkboxes */}
            {isPdfOrZip && (
              <fieldset className="space-y-2">
                <legend className="sr-only">Options</legend>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeScreenshots}
                    onChange={(e) => setIncludeScreenshots(e.target.checked)}
                    className="accent-slate-900"
                  />
                  <span className="text-sm text-foreground">
                    {t("includeScreenshots")}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e) => setIncludeNotes(e.target.checked)}
                    className="accent-slate-900"
                  />
                  <span className="text-sm text-foreground">
                    {t("includeNotes")}
                  </span>
                </label>

                {isPdf && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEngagement}
                      onChange={(e) => setIncludeEngagement(e.target.checked)}
                      className="accent-slate-900"
                    />
                    <span className="text-sm text-foreground">
                      {t("includeEngagement")}
                    </span>
                  </label>
                )}
              </fieldset>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={generating}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={generating}
                className={clsx(
                  "rounded-md px-4 py-2 text-sm font-medium text-white transition-colors",
                  generating
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                )}
              >
                {generating ? t("generating") : t("export")}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
