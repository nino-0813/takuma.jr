import { NavLink, Outlet } from "react-router-dom";
import {
  CalendarIcon,
  KeyIcon,
  MegaphoneIcon,
  UsersIcon,
} from "./icons";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "予定", icon: CalendarIcon, end: true },
  { to: "/board", label: "お知らせ", icon: MegaphoneIcon },
  { to: "/duties", label: "当番", icon: KeyIcon },
  { to: "/team", label: "チーム", icon: UsersIcon },
];

export default function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-[#f2f4f7]">
      <main className="flex-1 pb-[calc(4.75rem+var(--safe-bottom))]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-slate-200/70 bg-white/85 pb-[var(--safe-bottom)] backdrop-blur-xl">
        <div className="flex">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] font-semibold",
                  isActive ? "text-pitch-600" : "text-slate-400"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <t.icon
                    width={26}
                    height={26}
                    strokeWidth={isActive ? 2.2 : 1.9}
                  />
                  {t.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ページ共通の大見出しヘッダー（iOS Large Title 風） */
export function PageHeader({
  title,
  right,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="px-5 pb-2 pt-[calc(1rem+var(--safe-top))]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}
