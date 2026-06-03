import {
  forwardRef,
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { CloseIcon } from "./icons";

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "ghost" | "subtle" | "danger";

export function Button({
  variant = "subtle",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "af-interactive inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-accent text-accent-fg hover:brightness-105 active:brightness-95",
    ghost: "text-text-dim hover:bg-surface-2 hover:text-text",
    subtle: "bg-surface-2 text-text hover:bg-surface border border-border",
    danger: "text-danger hover:bg-danger/10",
  };
  return (
    <button className={cx(base, variants[variant], className)} {...props} />
  );
}

export function IconButton({
  className,
  label,
  active,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cx(
        "af-interactive inline-flex h-8 w-8 items-center justify-center rounded-lg",
        active
          ? "bg-accent-soft text-accent"
          : "text-text-dim hover:bg-surface-2 hover:text-text",
        className,
      )}
      {...props}
    />
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }
>(function TextInput({ className, mono, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cx("af-input", mono && "font-mono", className)}
      {...props}
    />
  );
});

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx("af-input cursor-pointer appearance-none pr-8", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "af-interactive relative inline-flex h-5 w-9 shrink-0 items-center rounded-full",
        checked ? "bg-accent" : "bg-border-strong",
      )}
    >
      <span
        className={cx(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-normal ease-out",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

export interface TabItem {
  id: string;
  label: ReactNode;
}

export function Tabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: TabItem[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="scroll-thin flex items-center gap-0.5 overflow-x-auto border-b border-border overflow-y-hidden"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.id)}
            className={cx(
              "af-interactive relative shrink-0 px-2.5 py-2 text-xs font-medium sm:px-3 sm:py-2.5 sm:text-sm",
              selected ? "text-text" : "text-text-faint hover:text-text-dim",
            )}
          >
            {tab.label}
            {selected && (
              <span className="af-tab-indicator absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-soft px-1 text-2xs font-semibold text-accent">
      {count}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex animate-backdrop-in items-end justify-center bg-black/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-start sm:p-4 sm:pt-[10vh]"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[min(90dvh,100%)] w-full max-w-xl animate-slide-up flex-col rounded-xl border border-border-strong bg-surface shadow-2xl sm:max-h-[85dvh] sm:animate-fade-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </header>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export { cx };
