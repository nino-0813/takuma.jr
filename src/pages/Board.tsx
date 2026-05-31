import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
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
import { MegaphoneIcon, PinIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import type { Announcement, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Board() {
  const { team, member } = useSession();
  const [items, setItems] = useState<Announcement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    if (!team) return;
    const [{ data: a }, { data: m }] = await Promise.all([
      supabase
        .from("announcements")
        .select("*")
        .eq("team_id", team.id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("members").select("*").eq("team_id", team.id),
    ]);
    setItems((a as Announcement[]) ?? []);
    setMembers((m as Member[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id]);

  const authorName = (mid: string | null) =>
    members.find((m) => m.id === mid)?.name ?? "メンバー";

  async function togglePin(a: Announcement) {
    await supabase
      .from("announcements")
      .update({ pinned: !a.pinned })
      .eq("id", a.id);
    load();
  }

  async function remove(a: Announcement) {
    if (!confirm("このお知らせを削除しますか？")) return;
    await supabase.from("announcements").delete().eq("id", a.id);
    load();
  }

  return (
    <div>
      <PageHeader title="お知らせ" subtitle="大事な連絡はここに" />
      <Fab label="お知らせを投稿" onClick={() => setShowAdd(true)} />

      <div className="space-y-3 px-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<MegaphoneIcon width={40} height={40} />}
              title="お知らせはまだありません"
              hint="右上の＋から連絡を投稿できます"
            />
          </Card>
        ) : (
          items.map((a) => (
            <Card
              key={a.id}
              className={cn(
                "p-4",
                a.pinned && "ring-2 ring-amber-300"
              )}
            >
              {a.pinned && (
                <div className="mb-1.5 flex items-center gap-1 text-xs font-bold text-amber-500">
                  <PinIcon width={14} height={14} /> 固定
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[17px] font-bold leading-snug">{a.title}</h3>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
                {a.body}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Avatar name={authorName(a.member_id)} size={20} />
                  {authorName(a.member_id)}・
                  {formatDistanceToNow(new Date(a.created_at), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePin(a)}
                    className={cn(
                      "rounded-full p-1.5",
                      a.pinned ? "text-amber-500" : "text-slate-300"
                    )}
                  >
                    <PinIcon width={18} height={18} />
                  </button>
                  {(a.member_id === member?.id || member?.role === "admin") && (
                    <button
                      onClick={() => remove(a)}
                      className="rounded-full p-1.5 text-slate-300"
                    >
                      <TrashIcon width={18} height={18} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <AddAnnouncementSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => {
          setShowAdd(false);
          load();
        }}
      />
    </div>
  );
}

function AddAnnouncementSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { team, member } = useSession();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!team || !title.trim() || !body.trim()) return;
    setBusy(true);
    await supabase.from("announcements").insert({
      team_id: team.id,
      member_id: member?.id ?? null,
      title: title.trim(),
      body: body.trim(),
      pinned,
    });
    setBusy(false);
    setTitle("");
    setBody("");
    setPinned(false);
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="お知らせを投稿">
      <div className="space-y-4 pb-2">
        <Field label="タイトル">
          <input
            className={inputClass}
            placeholder="例）今週末の試合について"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="内容">
          <textarea
            className={inputClass + " min-h-[120px] resize-none"}
            placeholder="連絡内容を入力…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        <button
          onClick={() => setPinned((p) => !p)}
          className={cn(
            "tap-shrink flex w-full items-center justify-between rounded-2xl px-4 py-3.5 ring-1",
            pinned
              ? "bg-amber-50 ring-amber-300"
              : "bg-white ring-slate-200"
          )}
        >
          <span className="flex items-center gap-2 font-semibold">
            <PinIcon
              width={18}
              height={18}
              className={pinned ? "text-amber-500" : "text-slate-400"}
            />
            上に固定する
          </span>
          <span
            className={cn(
              "h-6 w-10 rounded-full p-0.5 transition-colors",
              pinned ? "bg-amber-400" : "bg-slate-300"
            )}
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full bg-white transition-transform",
                pinned && "translate-x-4"
              )}
            />
          </span>
        </button>
        <Button
          className="w-full"
          disabled={busy || !title.trim() || !body.trim()}
          onClick={save}
        >
          {busy ? "投稿中…" : "投稿する"}
        </Button>
      </div>
    </Sheet>
  );
}
