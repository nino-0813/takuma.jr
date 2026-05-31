import { useEffect, useState } from "react";
import { isBefore, startOfToday } from "date-fns";
import { PageHeader } from "@/components/AppShell";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Fab,
  Field,
  Sheet,
  Spinner,
  inputClass,
} from "@/components/ui";
import { KeyIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import type { Duty, Member } from "@/lib/types";
import { cn, fmtDate, toDateKey } from "@/lib/utils";

export default function Duties() {
  const { team, member, isAdmin } = useSession();
  const [duties, setDuties] = useState<Duty[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    if (!team) return;
    const [{ data: d }, { data: m }] = await Promise.all([
      supabase
        .from("duties")
        .select("*")
        .eq("team_id", team.id)
        .eq("type", "key")
        .order("date"),
      supabase.from("members").select("*").eq("team_id", team.id).order("name"),
    ]);
    setDuties((d as Duty[]) ?? []);
    setMembers((m as Member[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id]);

  const memberName = (mid: string | null) =>
    members.find((m) => m.id === mid)?.name ?? "未割り当て";

  const today = startOfToday();
  const upcoming = duties.filter(
    (d) => !isBefore(new Date(d.date + "T00:00:00"), today)
  );
  const past = duties
    .filter((d) => isBefore(new Date(d.date + "T00:00:00"), today))
    .reverse();

  const myNext = upcoming.find((d) => d.member_id === member?.id);

  return (
    <div>
      <PageHeader title="鍵当番" subtitle="グランドの鍵の担当表" />
      {isAdmin && <Fab label="当番を追加" onClick={() => setShowAdd(true)} />}

      <div className="space-y-4 px-4">
        {myNext && (
          <Card className="bg-pitch-600 p-4 text-white">
            <p className="text-sm opacity-90">🔑 あなたの次の当番</p>
            <p className="mt-1 text-xl font-bold">{fmtDate(myNext.date)}</p>
            {myNext.note && (
              <p className="mt-0.5 text-sm opacity-90">{myNext.note}</p>
            )}
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : duties.length === 0 ? (
          <Card>
            <EmptyState
              icon={<KeyIcon width={40} height={40} />}
              title="当番はまだ登録されていません"
              hint={isAdmin ? "右上の＋から当番日を追加できます" : undefined}
            />
          </Card>
        ) : (
          <>
            <section>
              <h2 className="mb-2 ml-1 text-sm font-bold text-slate-500">
                これからの当番
              </h2>
              <Card className="divide-y divide-slate-100">
                {upcoming.length === 0 && (
                  <p className="px-4 py-4 text-center text-sm text-slate-400">
                    予定された当番はありません
                  </p>
                )}
                {upcoming.map((d) => (
                  <DutyRow
                    key={d.id}
                    d={d}
                    name={memberName(d.member_id)}
                    isMe={d.member_id === member?.id}
                    canEdit={isAdmin}
                    onDelete={async () => {
                      if (!confirm("この当番を削除しますか？")) return;
                      await supabase.from("duties").delete().eq("id", d.id);
                      load();
                    }}
                  />
                ))}
              </Card>
            </section>

            {past.length > 0 && (
              <section>
                <h2 className="mb-2 ml-1 text-sm font-bold text-slate-500">
                  過去の当番
                </h2>
                <Card className="divide-y divide-slate-100 opacity-60">
                  {past.slice(0, 10).map((d) => (
                    <DutyRow
                      key={d.id}
                      d={d}
                      name={memberName(d.member_id)}
                      isMe={false}
                      canEdit={false}
                    />
                  ))}
                </Card>
              </section>
            )}
          </>
        )}
      </div>

      {isAdmin && (
        <AddDutySheet
          open={showAdd}
          onClose={() => setShowAdd(false)}
          members={members}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function DutyRow({
  d,
  name,
  isMe,
  canEdit,
  onDelete,
}: {
  d: Duty;
  name: string;
  isMe: boolean;
  canEdit: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pitch-50 text-pitch-600">
        <KeyIcon width={20} height={20} />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{fmtDate(d.date)}</p>
        {d.note && <p className="text-xs text-slate-400">{d.note}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-semibold",
            isMe ? "bg-pitch-600 text-white" : "bg-slate-100 text-slate-600"
          )}
        >
          <Avatar name={name} size={22} />
          {name}
          {isMe && " (あなた)"}
        </span>
        {canEdit && onDelete && (
          <button onClick={onDelete} className="text-slate-300">
            <TrashIcon width={18} height={18} />
          </button>
        )}
      </div>
    </div>
  );
}

function AddDutySheet({
  open,
  onClose,
  members,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  onSaved: () => void;
}) {
  const { team } = useSession();
  const [date, setDate] = useState(toDateKey(new Date()));
  const [memberId, setMemberId] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!team || !date) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.from("duties").upsert(
      {
        team_id: team.id,
        date,
        type: "key",
        member_id: memberId || null,
        note: note.trim() || null,
      },
      { onConflict: "team_id,date,type" }
    );
    setBusy(false);
    if (error) {
      setError("保存に失敗しました");
      return;
    }
    setNote("");
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="当番を追加">
      <div className="space-y-4 pb-2">
        <Field label="日付">
          <input
            type="date"
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="担当者">
          <select
            className={inputClass}
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            <option value="">未割り当て</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="メモ（任意）">
          <input
            className={inputClass}
            placeholder="例）朝練あり / 開錠は7時"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" disabled={busy} onClick={save}>
          {busy ? "保存中…" : "登録する"}
        </Button>
        <p className="px-2 text-center text-xs text-slate-400">
          同じ日付に登録すると上書きされます
        </p>
      </div>
    </Sheet>
  );
}
