import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Avatar,
  Button,
  Card,
  Field,
  FullSpinner,
  Segmented,
  Sheet,
  inputClass,
} from "@/components/ui";
import {
  CarIcon,
  ChevronLeftIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import type {
  Attendance,
  AttendanceStatus,
  Carpool,
  CarpoolRider,
  Member,
  TeamEvent,
} from "@/lib/types";
import { cn, eventTypeLabel, fmtDate } from "@/lib/utils";

const STATUS_META: Record<
  AttendanceStatus,
  { label: string; color: string; bg: string }
> = {
  yes: { label: "参加", color: "text-pitch-700", bg: "bg-pitch-100" },
  maybe: { label: "未定", color: "text-amber-700", bg: "bg-amber-100" },
  no: { label: "不参加", color: "text-slate-500", bg: "bg-slate-100" },
};

export default function EventDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { member, isAdmin } = useSession();
  const [event, setEvent] = useState<TeamEvent | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [atts, setAtts] = useState<Attendance[]>([]);
  const [carpools, setCarpools] = useState<Carpool[]>([]);
  const [riders, setRiders] = useState<CarpoolRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCarpool, setShowCarpool] = useState(false);

  async function load() {
    if (!id) return;
    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!ev) {
      setLoading(false);
      return;
    }
    const [{ data: ms }, { data: as }, { data: cs }] = await Promise.all([
      supabase.from("members").select("*").eq("team_id", ev.team_id).order("name"),
      supabase.from("attendances").select("*").eq("event_id", id),
      supabase.from("carpools").select("*").eq("event_id", id),
    ]);
    setEvent(ev as TeamEvent);
    setMembers((ms as Member[]) ?? []);
    setAtts((as as Attendance[]) ?? []);
    setCarpools((cs as Carpool[]) ?? []);
    const cids = (cs as Carpool[] | null)?.map((c) => c.id) ?? [];
    if (cids.length) {
      const { data: rs } = await supabase
        .from("carpool_riders")
        .select("*")
        .in("carpool_id", cids);
      setRiders((rs as CarpoolRider[]) ?? []);
    } else {
      setRiders([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setMyStatus(status: AttendanceStatus) {
    if (!event || !member) return;
    // 楽観的更新
    setAtts((prev) => {
      const others = prev.filter((a) => a.member_id !== member.id);
      return [
        ...others,
        {
          id: "temp",
          event_id: event.id,
          member_id: member.id,
          status,
          comment: null,
          updated_at: new Date().toISOString(),
        },
      ];
    });
    await supabase.from("attendances").upsert(
      {
        event_id: event.id,
        member_id: member.id,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,member_id" }
    );
    load();
  }

  async function removeEvent() {
    if (!event) return;
    if (!confirm("この予定を削除しますか？")) return;
    await supabase.from("events").delete().eq("id", event.id);
    nav("/", { replace: true });
  }

  if (loading) return <FullSpinner />;
  if (!event)
    return (
      <div className="p-8 text-center text-slate-500">予定が見つかりません</div>
    );

  const myStatus = atts.find((a) => a.member_id === member?.id)?.status;
  const memberName = (mid: string) =>
    members.find((m) => m.id === mid)?.name ?? "不明";
  const counts = {
    yes: atts.filter((a) => a.status === "yes").length,
    maybe: atts.filter((a) => a.status === "maybe").length,
    no: atts.filter((a) => a.status === "no").length,
  };
  const noReply = members.filter(
    (m) => !atts.some((a) => a.member_id === m.id)
  );

  return (
    <div className="pb-6">
      {/* ヘッダー */}
      <div className="bg-pitch-600 px-5 pb-6 pt-[calc(0.75rem+var(--safe-top))] text-white">
        <button
          onClick={() => nav(-1)}
          className="tap-shrink mb-3 flex items-center gap-1 text-white/90"
        >
          <ChevronLeftIcon width={22} height={22} /> 予定
        </button>
        <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-bold">
          {eventTypeLabel(event.type)}
        </span>
        <h1 className="mt-2 text-2xl font-bold">
          {event.type === "match" && event.opponent
            ? `vs ${event.opponent}`
            : event.title}
        </h1>
        <p className="mt-1 text-white/90">{fmtDate(event.start_at)}</p>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* 詳細情報 */}
        <Card className="divide-y divide-slate-100">
          <InfoRow
            icon={<ClockIcon width={18} height={18} />}
            label="開始 / 集合"
            value={`${format(new Date(event.start_at), "HH:mm")}${
              event.meet_time ? ` ／ 集合 ${event.meet_time}` : ""
            }`}
          />
          {event.location && (
            <InfoRow
              icon={<MapPinIcon width={18} height={18} />}
              label="場所"
              value={event.location}
            />
          )}
          {event.notes && (
            <div className="px-4 py-3">
              <p className="mb-1 text-xs font-semibold text-slate-400">メモ</p>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {event.notes}
              </p>
            </div>
          )}
        </Card>

        {/* 自分の参加表明 */}
        <Card className="p-4">
          <p className="mb-2 font-bold">あなたの出欠</p>
          <Segmented
            value={(myStatus ?? "") as AttendanceStatus}
            onChange={setMyStatus}
            options={[
              { value: "yes", label: "⭕️ 参加" },
              { value: "maybe", label: "🔺 未定" },
              { value: "no", label: "❌ 不参加" },
            ]}
          />
        </Card>

        {/* 集計 */}
        <Card className="p-4">
          <div className="mb-3 flex gap-2">
            {(["yes", "maybe", "no"] as AttendanceStatus[]).map((s) => (
              <div
                key={s}
                className={cn(
                  "flex-1 rounded-2xl py-3 text-center",
                  STATUS_META[s].bg
                )}
              >
                <p className={cn("text-2xl font-bold", STATUS_META[s].color)}>
                  {counts[s]}
                </p>
                <p className={cn("text-xs font-semibold", STATUS_META[s].color)}>
                  {STATUS_META[s].label}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            {(["yes", "maybe", "no"] as AttendanceStatus[]).map((s) => {
              const list = atts.filter((a) => a.status === s);
              if (list.length === 0) return null;
              return (
                <div key={s}>
                  <p className={cn("mb-1 text-xs font-bold", STATUS_META[s].color)}>
                    {STATUS_META[s].label}（{list.length}）
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((a) => (
                      <span
                        key={a.member_id}
                        className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-1 pr-2.5 text-sm"
                      >
                        <Avatar name={memberName(a.member_id)} size={22} />
                        {memberName(a.member_id)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {noReply.length > 0 && (
              <p className="pt-1 text-xs text-slate-400">
                未回答 {noReply.length}人：{noReply.map((m) => m.name).join("、")}
              </p>
            )}
          </div>
        </Card>

        {/* 配車 */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-bold">
              <CarIcon width={20} height={20} /> 配車・乗り合わせ
            </p>
            <button
              onClick={() => setShowCarpool(true)}
              className="tap-shrink flex items-center gap-0.5 rounded-full bg-pitch-50 px-3 py-1.5 text-sm font-semibold text-pitch-700"
            >
              <PlusIcon width={16} height={16} />車を出す
            </button>
          </div>

          {carpools.length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-400">
              まだ配車の募集はありません
            </p>
          ) : (
            <div className="space-y-3">
              {carpools.map((c) => {
                const myRiders = riders.filter((r) => r.carpool_id === c.id);
                const iAmIn = myRiders.some((r) => r.member_id === member?.id);
                const full = myRiders.length >= c.seats;
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar name={memberName(c.driver_member_id)} size={28} />
                        <div>
                          <p className="text-sm font-bold">
                            {memberName(c.driver_member_id)}の車
                          </p>
                          <p className="text-xs text-slate-400">
                            空き {Math.max(c.seats - myRiders.length, 0)} / {c.seats}席
                            {c.departure_time && ` ・ ${c.departure_time}発`}
                            {c.departure_place && ` ・ ${c.departure_place}`}
                          </p>
                        </div>
                      </div>
                      {c.driver_member_id === member?.id && (
                        <button
                          onClick={async () => {
                            if (!confirm("この配車を削除しますか？")) return;
                            await supabase.from("carpools").delete().eq("id", c.id);
                            load();
                          }}
                          className="text-slate-300"
                        >
                          <TrashIcon width={18} height={18} />
                        </button>
                      )}
                    </div>

                    {myRiders.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {myRiders.map((r) => (
                          <span
                            key={r.id}
                            className="rounded-full bg-white px-2.5 py-1 text-xs"
                          >
                            🙋 {memberName(r.member_id)}
                          </span>
                        ))}
                      </div>
                    )}

                    {c.driver_member_id !== member?.id && (
                      <button
                        onClick={async () => {
                          if (!member) return;
                          if (iAmIn) {
                            await supabase
                              .from("carpool_riders")
                              .delete()
                              .eq("carpool_id", c.id)
                              .eq("member_id", member.id);
                          } else {
                            if (full) return;
                            await supabase.from("carpool_riders").insert({
                              carpool_id: c.id,
                              member_id: member.id,
                            });
                          }
                          load();
                        }}
                        disabled={!iAmIn && full}
                        className={cn(
                          "tap-shrink mt-2 w-full rounded-xl py-2 text-sm font-semibold",
                          iAmIn
                            ? "bg-slate-200 text-slate-600"
                            : full
                              ? "bg-slate-100 text-slate-400"
                              : "bg-pitch-600 text-white"
                        )}
                      >
                        {iAmIn ? "乗せてもらうのをやめる" : full ? "満席" : "乗せてもらう"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {isAdmin && (
          <Button variant="danger" className="w-full" onClick={removeEvent}>
            この予定を削除
          </Button>
        )}
      </div>

      <AddCarpoolSheet
        open={showCarpool}
        onClose={() => setShowCarpool(false)}
        eventId={event.id}
        onSaved={() => {
          setShowCarpool(false);
          load();
        }}
      />
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-pitch-600">{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function AddCarpoolSheet({
  open,
  onClose,
  eventId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  onSaved: () => void;
}) {
  const { member } = useSession();
  const [seats, setSeats] = useState(3);
  const [time, setTime] = useState("08:00");
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!member) return;
    setBusy(true);
    await supabase.from("carpools").insert({
      event_id: eventId,
      driver_member_id: member.id,
      seats,
      departure_time: time || null,
      departure_place: place.trim() || null,
    });
    setBusy(false);
    setPlace("");
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="車を出す">
      <div className="space-y-4 pb-2">
        <Field label="乗せられる人数（席）">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              className="tap-shrink h-11 w-11 rounded-2xl bg-white text-xl font-bold ring-1 ring-slate-200"
            >
              −
            </button>
            <span className="w-10 text-center text-2xl font-bold">{seats}</span>
            <button
              onClick={() => setSeats((s) => Math.min(8, s + 1))}
              className="tap-shrink h-11 w-11 rounded-2xl bg-white text-xl font-bold ring-1 ring-slate-200"
            >
              ＋
            </button>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="出発時刻">
            <input
              type="time"
              className={inputClass}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
          <Field label="出発場所">
            <input
              className={inputClass}
              placeholder="例）学校前"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </Field>
        </div>
        <Button className="w-full" disabled={busy} onClick={save}>
          {busy ? "登録中…" : "配車を募集する"}
        </Button>
      </div>
    </Sheet>
  );
}
