import * as Dialog from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/** Modal de confirmação acessível (foco preso, ESC fecha) para ações críticas. */
export function ConfirmDialog({ open, title, description, confirmLabel, danger, onConfirm, onCancel }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
          <Dialog.Title className="font-serif text-lg font-bold text-navy">{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-2 text-sm leading-relaxed text-slate-600">{description}</div>
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
                danger ? "bg-red-700 hover:bg-red-800" : "bg-navy hover:bg-navy-soft"
              }`}
            >
              {busy ? "Aguarde…" : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
