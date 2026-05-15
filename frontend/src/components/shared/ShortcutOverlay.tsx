"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

interface ShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  labelKey: TranslationKey;
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: ["j"], labelKey: "shortcutNextPost" },
  { keys: ["k"], labelKey: "shortcutPrevPost" },
  { keys: ["Enter", "o"], labelKey: "shortcutOpenPost" },
  { keys: ["Shift+O"], labelKey: "shortcutOpenOriginal" },
  { keys: ["t"], labelKey: "shortcutTagPost" },
  { keys: ["n"], labelKey: "shortcutNotePost" },
  { keys: ["s"], labelKey: "shortcutMarkReviewed" },
  { keys: ["x"], labelKey: "shortcutToggleSelect" },
  { keys: ["?"], labelKey: "shortcutShowHelp" },
];

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  const { t } = useI18n();

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:pointer-events-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              {t("keyboardShortcuts")}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {/* Shortcut list — two-column grid: kbd | label */}
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5">
            {SHORTCUTS.map(({ keys, labelKey }) => (
              <React.Fragment key={labelKey}>
                <div className="flex items-center gap-1 justify-end">
                  {keys.map((k) => (
                    <kbd
                      key={k}
                      className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
                <span className="text-sm text-foreground self-center">
                  {t(labelKey)}
                </span>
              </React.Fragment>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
