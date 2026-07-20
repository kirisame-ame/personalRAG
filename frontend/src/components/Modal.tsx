import { useEffect, useId, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function Modal({
  open,
  title,
  children,
  confirmLabel = "CONFIRM",
  cancelLabel = "CANCEL",
  onConfirm,
  onCancel,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(21,21,21,.28)] p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm border border-[#aaa79e] bg-[#eeece6] p-5 shadow-[0_12px_24px_rgba(21,21,21,.16)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <p
          id={titleId}
          className="m-0 font-mono text-xs font-semibold tracking-[.08em]"
        >
          {title}
        </p>
        <div className="mt-3 mb-5 text-sm leading-6 text-[#55534e]">
          {children}
        </div>
        <div className="flex justify-end gap-3 font-mono text-[10px] tracking-[.08em]">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer border border-[#aaa79e] bg-transparent px-3 py-2 text-[#151515]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer border border-[#ed542c] bg-[#ed542c] px-3 py-2 text-[#eeece6]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
