import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ja } from "date-fns/locale";
import { PageHeader } from "@/components/AppShell";
import {
  Button,
  Card,
  EmptyState,
  Fab,
  Field,
  Segmented,
  Sheet,
  Spinner,
  inputClass,
} from "@/components/ui";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
} from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import type { EventType, TeamEvent } from "@/lib/types";
import {
  cn,
  eventTypeColor,
  eventTypeLabel,
  fmtDate,
  toDateKey,
} from "@/lib/utils";

export default function Calendar() {
  const { team, isAdmin } = useSession();
  const nav = useNavigate();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    if (!team) return;
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("team_id", team.id)
      .order("start_at");
    setEvents((data as TeamEvent[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, TeamEvent[]>();
    for (const e of events) {
      const key = toDateKey(new Date(e.start_at));
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDay.get(toDateKey(selected)) ?? [];
  const upcoming = useMemo(
    () =>
      events
        .filter((e) => new Date(e.start_at) >= new Date(new Date().toDateString()))
        .slice(0, 8),
    [events]
  );

  return (
    <div>
      <PageHeader title="予定" subtitle={team?.name} />
      {isAdmin && <Fab label="予定を追加" onClick={() => setShowAdd(true)} />}

      {/* カレンダー */}
      <div className="px-4">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setMonth(addMonths(month, -1))}
              className="tap-shrink rounded-full p-1 text-slate-400"
            >
              <ChevronLeftIcon />
            </button>
            <p className="text-lg font-bold">
              {format(month, "yyyy年 M月", { locale: ja })}
            </p>
            <button
              onClick={() => setMonth(addMonths(month, 1))}
              className="tap-shrink rounded-full p-1 text-slate-400"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400">
            {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
              <div
                key={w}
                className={cn(i === 0 && "text-red-400", i === 6 && "text-sky-400")}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-y-1">
            {days.map((d) => {
              const key = toDateKey(d);
              const dayEvents = eventsByDay.get(key) ?? [];
              const isSel = isSameDay(d, selected);
              const isCur = isSameMonth(d, month);
              const today = isSameDay(d, new Date());
              return (
                <button
                  key={key}
                  onClick={() => setSelected(d)}
                  className="flex flex-col items-center py-1"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-[15px]",
                      isSel && "bg-pitch-600 font-bold text-white",
                      !isSel && today && "font-bold text-pitch-600",
                      !isSel && !today && isCur && "text-slate-800",
                      !isCur && "text-slate-300"
                    )}
                  >
                    {format(d, "d")}
                  </span>
                  <span className="mt-0.5 flex h-1.5 gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          eventTypeColor(e.type)
                        )}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 選択日の予定 */}
      {selectedEvents.length > 0 && (
        <section className="mt-5 px-4">
          <h2 className="mb-2 ml-1 text-sm font-bold text-slate-500">
            {fmtDate(selected.toISOString())} の予定
          </h2>
          <div className="space-y-2">
            {selectedEvents.map((e) => (
              <EventRow key={e.id} e={e} onClick={() => nav(`/event/${e.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* これからの予定 */}
      <section className="mt-5 px-4">
        <h2 className="mb-2 ml-1 text-sm font-bold text-slate-500">
          これからの予定
        </h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : upcoming.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CalendarIcon width={40} height={40} />}
              title="予定はまだありません"
              hint={isAdmin ? "右上の＋から試合・練習を追加できます" : undefined}
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventRow key={e.id} e={e} onClick={() => nav(`/event/${e.id}`)} />
            ))}
          </div>
        )}
      </section>

      {isAdmin && (
        <AddEventSheet
          open={showAdd}
          onClose={() => setShowAdd(false)}
          defaultDate={selected}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function EventRow({ e, onClick }: { e: TeamEvent; onClick: () => void }) {
  const d = new Date(e.start_at);
  return (
    <Card
      onClick={onClick}
      className="tap-shrink flex cursor-pointer items-center gap-3 p-3.5"
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl text-white",
          eventTypeColor(e.type)
        )}
      >
        <span className="text-[10px] leading-none opacity-90">
          {format(d, "M月")}
        </span>
        <span className="text-lg font-bold leading-tight">{format(d, "d")}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
            {eventTypeLabel(e.type)}
          </span>
          <p className="truncate font-bold">
            {e.type === "match" && e.opponent ? `vs ${e.opponent}` : e.title}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
          {e.meet_time && (
            <span className="flex items-center gap-0.5">
              <ClockIcon width={13} height={13} />集合 {e.meet_time}
            </span>
          )}
          {e.location && (
            <span className="flex items-center gap-0.5">
              <MapPinIcon width={13} height={13} />
              {e.location}
            </span>
          )}
        </div>
      </div>
      <ChevronRightIcon width={20} height={20} className="text-slate-300" />
    </Card>
  );
}

function AddEventSheet({
  open,
  onClose,
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: Date;
  onSaved: () => void;
}) {
  const { team } = useSession();
  const [type, setType] = useState<EventType>("match");
  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(toDateKey(defaultDate));
  const [start, setStart] = useState("09:00");
  const [meet, setMeet] = useState("08:30");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setDate(toDateKey(defaultDate));
  }, [open, defaultDate]);

  async function save() {
    if (!team) return;
    setBusy(true);
    const start_at = new Date(`${date}T${start}:00`).toISOString();
    await supabase.from("events").insert({
      team_id: team.id,
      type,
      title: title.trim() || (type === "match" ? "試合" : eventTypeLabel(type)),
      opponent: type === "match" ? opponent.trim() || null : null,
      location: location.trim() || null,
      start_at,
      meet_time: meet || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    setTitle("");
    setOpponent("");
    setLocation("");
    setNotes("");
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="予定を追加">
      <div className="space-y-4 pb-2">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "match", label: "試合" },
            { value: "practice", label: "練習" },
            { value: "other", label: "その他" },
          ]}
        />

        {type === "match" ? (
          <Field label="対戦相手">
            <input
              className={inputClass}
              placeholder="例）FC みなみ"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            />
          </Field>
        ) : (
          <Field label="タイトル">
            <input
              className={inputClass}
              placeholder={type === "practice" ? "例）通常練習" : "例）保護者会"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="日付">
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="開始時刻">
            <input
              type="time"
              className={inputClass}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="集合時刻">
            <input
              type="time"
              className={inputClass}
              value={meet}
              onChange={(e) => setMeet(e.target.value)}
            />
          </Field>
          <Field label="場所">
            <input
              className={inputClass}
              placeholder="例）市民グランド"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
        </div>

        <Field label="メモ・持ち物など">
          <textarea
            className={inputClass + " min-h-[80px] resize-none"}
            placeholder="例）水筒・すねあて必須。雨天時は体育館"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <Button className="w-full" disabled={busy} onClick={save}>
          {busy ? "保存中…" : "この予定を追加"}
        </Button>
      </div>
    </Sheet>
  );
}
