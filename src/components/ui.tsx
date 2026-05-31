import {
  useEffect,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { PlusIcon } from "./icons";

/* ---------------- Floating Action Button（右下の＋） ----------------
   画面上部のノッチ/ステータスバーに隠れないよう、タブバーの上に固定表示 */
export function Fab({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px]">
      <div className="flex justify-end px-4 pb-[calc(4.75rem+var(--safe-bottom)+0.85rem)]">
        <button
          onClick={onClick}
          aria-label={label ?? "追加"}
          className="tap-shrink pointer-events-auto flex h-14 items-center justify-center gap-1.5 rounded-full bg-pitch-600 px-5 font-bold text-white shadow-lg shadow-pitch-700/30"
        >
          <PlusIcon width={24} height={24} />
          {label && <span className="pr-1 text-[15px]">{label}</span>}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Button ---------------- */
type Variant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-pitch-600 text-white shadow-sm active:bg-pitch-700",
    secondary: "bg-pitch-50 text-pitch-700 active:bg-pitch-100",
    ghost: "bg-transparent text-slate-600 active:bg-slate-100",
    danger: "bg-red-50 text-red-600 active:bg-red-100",
  };
  return (
    <button
      className={cn(
        "tap-shrink inline-flex items-center justify-center gap-1.5 rounded-2xl px-5 py-3.5 text-[15px] font-semibold disabled:opacity-40",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---------------- Bottom Sheet (iOS風モーダル) ---------------- */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="animate-fade-in absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="animate-sheet-up relative max-h-[90vh] overflow-y-auto rounded-t-[1.75rem] bg-[#f2f4f7] pb-[max(1.25rem,var(--safe-bottom))]">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#f2f4f7]/90 px-5 pb-3 pt-3 backdrop-blur">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="tap-shrink rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-600"
          >
            閉じる
          </button>
        </div>
        <div className="px-4 pt-1">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Segmented Control ---------------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex rounded-2xl bg-slate-200/70 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-xl py-2 text-sm font-semibold transition-all",
            value === o.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = name.trim().slice(0, 2);
  const colors = [
    "bg-pitch-500",
    "bg-sky-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-teal-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  const color = colors[h % colors.length];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        color
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

/* ---------------- Spinner ---------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-6 w-6 animate-spin rounded-full border-[3px] border-slate-200 border-t-pitch-600",
        className
      )}
    />
  );
}

export function FullSpinner() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

/* ---------------- Empty State ---------------- */
export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="font-semibold text-slate-500">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

/* ---------------- Input ---------------- */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 ml-1 block text-sm font-semibold text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-pitch-500";
