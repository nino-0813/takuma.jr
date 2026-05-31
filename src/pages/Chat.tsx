import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import { Avatar, Spinner } from "@/components/ui";
import { ChatIcon, SendIcon, TrashIcon } from "@/components/icons";
import MemberSheet from "@/components/MemberSheet";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { sendPush } from "@/lib/push";
import type { ChatRead, Member, Message, MessageReaction } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";

const REACTIONS = ["👍", "❤️", "⚽️", "😂", "🙏", "✅"];

export default function Chat() {
  const { team, member } = useSession();
  const { clear } = useUnread();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [reads, setReads] = useState<Map<string, number>>(new Map());
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [viewing, setViewing] = useState<Member | null>(null);
  const [actionMsg, setActionMsg] = useState<Message | null>(null);
  const [readInfoMsg, setReadInfoMsg] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const memberMap = useMemo(() => {
    const m = new Map<string, Member>();
    members.forEach((x) => m.set(x.id, x));
    return m;
  }, [members]);

  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, MessageReaction[]>();
    for (const r of reactions) {
      const arr = map.get(r.message_id) ?? [];
      arr.push(r);
      map.set(r.message_id, arr);
    }
    return map;
  }, [reactions]);

  function scrollToBottom(smooth = false) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  const markRead = useCallback(async () => {
    if (!team || !member) return;
    const now = new Date().toISOString();
    await supabase.from("chat_reads").upsert(
      { team_id: team.id, member_id: member.id, last_read_at: now },
      { onConflict: "team_id,member_id" }
    );
  }, [team, member]);

  // 初期ロード
  useEffect(() => {
    if (!team) return;
    let active = true;
    (async () => {
      const [{ data: msgs }, { data: ms }, { data: rs }, { data: rx }] =
        await Promise.all([
          supabase
            .from("messages")
            .select("*")
            .eq("team_id", team.id)
            .order("created_at", { ascending: true })
            .limit(300),
          supabase.from("members").select("*").eq("team_id", team.id),
          supabase.from("chat_reads").select("*").eq("team_id", team.id),
          supabase.from("message_reactions").select("*").eq("team_id", team.id),
        ]);
      if (!active) return;
      setMessages((msgs as Message[]) ?? []);
      setMembers((ms as Member[]) ?? []);
      setReactions((rx as MessageReaction[]) ?? []);
      const map = new Map<string, number>();
      ((rs as ChatRead[]) ?? []).forEach((r) =>
        map.set(r.member_id, new Date(r.last_read_at).getTime())
      );
      setReads(map);
      setLoading(false);
      setTimeout(() => scrollToBottom(), 50);
      markRead();
    })();
    return () => {
      active = false;
    };
  }, [team?.id, markRead]);

  // リアクションのローカル更新（同じ人×同じ絵文字は1つに）
  const upsertReaction = useCallback((r: MessageReaction) => {
    setReactions((prev) => {
      const filtered = prev.filter(
        (x) =>
          !(
            x.message_id === r.message_id &&
            x.member_id === r.member_id &&
            x.emoji === r.emoji
          )
      );
      return [...filtered, r];
    });
  }, []);

  // リアルタイム購読
  useEffect(() => {
    if (!team) return;
    const channel = supabase
      .channel(`chat:${team.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `team_id=eq.${team.id}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
          if (m.member_id !== member?.id) markRead();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const id = (payload.old as { id?: string })?.id;
          if (id) setMessages((prev) => prev.filter((x) => x.id !== id));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads", filter: `team_id=eq.${team.id}` },
        (payload) => {
          const r = payload.new as ChatRead;
          if (!r?.member_id) return;
          setReads((prev) => {
            const next = new Map(prev);
            next.set(r.member_id, new Date(r.last_read_at).getTime());
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions", filter: `team_id=eq.${team.id}` },
        (payload) => upsertReaction(payload.new as MessageReaction)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const id = (payload.old as { id?: string })?.id;
          if (id) setReactions((prev) => prev.filter((x) => x.id !== id));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [team?.id, member?.id, markRead, upsertReaction]);

  useEffect(() => {
    scrollToBottom(true);
    clear(); // チャットを見ている間は未読バッジを消す
  }, [messages.length, clear]);

  function splitReaders(msg: Message) {
    const t = new Date(msg.created_at).getTime();
    const read: Member[] = [];
    const unread: Member[] = [];
    members.forEach((mem) => {
      if (mem.id === msg.member_id) return;
      const r = reads.get(mem.id);
      if (r != null && r >= t) read.push(mem);
      else unread.push(mem);
    });
    return { read, unread };
  }

  async function send() {
    const body = text.trim();
    if (!team || !member || !body || sending) return;
    setSending(true);
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ team_id: team.id, member_id: member.id, body })
      .select()
      .single();
    setSending(false);
    if (error) {
      setText(body);
      return;
    }
    if (data) {
      const m = data as Message;
      setMessages((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, m]
      );
    }
    sendPush({
      teamId: team.id,
      title: `💬 ${member.name}`,
      body,
      url: "/chat",
      excludeMemberId: member.id,
    });
    markRead();
  }

  async function deleteMessage(m: Message) {
    setActionMsg(null);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    await supabase.from("messages").delete().eq("id", m.id);
  }

  async function copyMessage(m: Message) {
    setActionMsg(null);
    try {
      await navigator.clipboard.writeText(m.body);
    } catch {
      /* 無視 */
    }
  }

  async function toggleReaction(msg: Message, emoji: string) {
    if (!team || !member) return;
    setActionMsg(null);
    const mine = reactions.find(
      (r) =>
        r.message_id === msg.id && r.member_id === member.id && r.emoji === emoji
    );
    if (mine) {
      setReactions((prev) => prev.filter((x) => x !== mine));
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", msg.id)
        .eq("member_id", member.id)
        .eq("emoji", emoji);
    } else {
      const temp: MessageReaction = {
        id: "temp-" + Date.now(),
        team_id: team.id,
        message_id: msg.id,
        member_id: member.id,
        emoji,
        created_at: new Date().toISOString(),
      };
      upsertReaction(temp);
      const { data } = await supabase
        .from("message_reactions")
        .insert({
          team_id: team.id,
          message_id: msg.id,
          member_id: member.id,
          emoji,
        })
        .select()
        .single();
      if (data) upsertReaction(data as MessageReaction);
    }
  }

  const others = members.filter((m) => m.id !== member?.id).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 px-5 pb-3 pt-[calc(0.9rem+var(--safe-top))] backdrop-blur-xl">
        <h1 className="text-xl font-bold">チャット</h1>
        <p className="text-xs text-slate-400">{team?.name}・タップでリアクション</p>
      </header>

      <div className="flex-1 px-3 pb-[calc(8rem+var(--safe-bottom))] pt-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center text-slate-400">
            <ChatIcon width={44} height={44} className="mb-3 text-slate-300" />
            <p className="font-semibold">まだメッセージがありません</p>
            <p className="mt-1 text-sm">最初のひとことを送ってみましょう👋</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const mine = m.member_id === member?.id;
            const author = m.member_id ? memberMap.get(m.member_id) : undefined;
            const showName = !mine && (!prev || prev.member_id !== m.member_id);
            const newDay =
              !prev ||
              !isSameDay(new Date(prev.created_at), new Date(m.created_at));
            const isLastMine =
              mine &&
              (i === messages.length - 1 ||
                messages[i + 1]?.member_id !== m.member_id);
            const rc = mine ? splitReaders(m).read.length : 0;
            const msgReactions = reactionsByMessage.get(m.id) ?? [];
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-semibold text-slate-500">
                      {fmtDate(m.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "flex items-end gap-2",
                    mine ? "flex-row-reverse" : "flex-row",
                    showName ? "mt-2" : "mt-0.5"
                  )}
                >
                  {!mine && (
                    <div className="w-7 shrink-0">
                      {showName && author && (
                        <button onClick={() => setViewing(author)} className="tap-shrink">
                          <Avatar name={author.name} size={28} />
                        </button>
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex max-w-[75%] flex-col",
                      mine ? "items-end" : "items-start"
                    )}
                  >
                    {showName && (
                      <button
                        onClick={() => author && setViewing(author)}
                        className="mb-0.5 ml-1 text-[11px] text-slate-400"
                      >
                        {author?.name ?? "退会したメンバー"}
                      </button>
                    )}
                    <div className="flex items-end gap-1.5">
                      {mine && (
                        <div className="mb-0.5 flex flex-col items-end text-[10px] leading-tight text-slate-400">
                          {isLastMine && rc > 0 && (
                            <button
                              onClick={() => setReadInfoMsg(m)}
                              className="font-semibold text-pitch-600"
                            >
                              {rc >= others && others > 0 ? `既読 全${rc}` : `既読 ${rc}`}
                            </button>
                          )}
                          <span>{format(new Date(m.created_at), "HH:mm")}</span>
                        </div>
                      )}
                      <button
                        onClick={() => setActionMsg(m)}
                        className={cn(
                          "no-callout whitespace-pre-wrap break-words rounded-[1.15rem] px-3.5 py-2 text-left text-[15px] leading-relaxed",
                          mine
                            ? "rounded-br-md bg-pitch-600 text-white"
                            : "rounded-bl-md bg-white text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                        )}
                      >
                        {m.body}
                      </button>
                      {!mine && (
                        <span className="mb-0.5 text-[10px] text-slate-400">
                          {format(new Date(m.created_at), "HH:mm")}
                        </span>
                      )}
                    </div>

                    {/* リアクション表示 */}
                    {msgReactions.length > 0 && (
                      <div
                        className={cn(
                          "mt-1 flex flex-wrap gap-1",
                          mine ? "justify-end" : "justify-start"
                        )}
                      >
                        {REACTIONS.filter((e) =>
                          msgReactions.some((r) => r.emoji === e)
                        ).map((emoji) => {
                          const list = msgReactions.filter((r) => r.emoji === emoji);
                          const reactedByMe = list.some(
                            (r) => r.member_id === member?.id
                          );
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(m, emoji)}
                              className={cn(
                                "tap-shrink flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs",
                                reactedByMe
                                  ? "border-pitch-300 bg-pitch-50 text-pitch-700"
                                  : "border-slate-200 bg-white text-slate-500"
                              )}
                            >
                              <span className="text-sm">{emoji}</span>
                              {list.length}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力バー */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px]">
        <div className="border-t border-slate-200/70 bg-white/90 px-3 pb-[calc(4.75rem+var(--safe-bottom))] pt-2.5 backdrop-blur-xl">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="メッセージを入力…"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-3xl bg-slate-100 px-4 py-2.5 text-[16px] outline-none focus:bg-white focus:ring-2 focus:ring-pitch-500"
            />
            <button
              onClick={send}
              disabled={!text.trim() || sending}
              className={cn(
                "tap-shrink flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors",
                text.trim() && !sending ? "bg-pitch-600" : "bg-slate-300"
              )}
            >
              <SendIcon width={20} height={20} />
            </button>
          </div>
        </div>
      </div>

      <MemberSheet member={viewing} onClose={() => setViewing(null)} />

      <ActionSheet
        message={actionMsg}
        mine={actionMsg?.member_id === member?.id}
        onClose={() => setActionMsg(null)}
        onReact={(emoji) => actionMsg && toggleReaction(actionMsg, emoji)}
        onCopy={() => actionMsg && copyMessage(actionMsg)}
        onDelete={() => actionMsg && deleteMessage(actionMsg)}
        onReadInfo={() => {
          const m = actionMsg;
          setActionMsg(null);
          setReadInfoMsg(m);
        }}
      />

      <ReadInfoSheet
        message={readInfoMsg}
        onClose={() => setReadInfoMsg(null)}
        split={readInfoMsg ? splitReaders(readInfoMsg) : { read: [], unread: [] }}
        onTapMember={(mem) => {
          setReadInfoMsg(null);
          setViewing(mem);
        }}
      />
    </div>
  );
}

/* ---------------- タップで開くアクションメニュー ---------------- */
function ActionSheet({
  message,
  mine,
  onClose,
  onReact,
  onCopy,
  onDelete,
  onReadInfo,
}: {
  message: Message | null;
  mine: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onDelete: () => void;
  onReadInfo: () => void;
}) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end p-3">
      <div className="animate-fade-in absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-sheet-up relative pb-[var(--safe-bottom)]">
        {/* リアクション選択 */}
        <div className="mb-2 flex items-center justify-around rounded-[1.4rem] bg-white/95 px-2 py-2 backdrop-blur">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className="tap-shrink flex h-12 w-12 items-center justify-center rounded-full text-2xl active:bg-slate-100"
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="mb-2 overflow-hidden rounded-[1.1rem] bg-white/95 backdrop-blur">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="line-clamp-2 text-sm text-slate-500">{message.body}</p>
          </div>
          <ActionRow label="コピー" onClick={onCopy} />
          {mine && <ActionRow label="既読を確認" onClick={onReadInfo} />}
          {mine && (
            <ActionRow
              label="削除"
              danger
              icon={<TrashIcon width={18} height={18} />}
              onClick={() => {
                if (confirm("このメッセージを削除しますか？")) onDelete();
              }}
            />
          )}
        </div>
        <button
          onClick={onClose}
          className="tap-shrink w-full rounded-[1.1rem] bg-white py-3.5 text-[17px] font-bold text-pitch-600"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

function ActionRow({
  label,
  onClick,
  danger,
  icon,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-1.5 border-b border-slate-100 py-3.5 text-[17px] last:border-0 active:bg-slate-100",
        danger ? "font-semibold text-red-500" : "text-slate-800"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* ---------------- 既読の詳細 ---------------- */
function ReadInfoSheet({
  message,
  onClose,
  split,
  onTapMember,
}: {
  message: Message | null;
  onClose: () => void;
  split: { read: Member[]; unread: Member[] };
  onTapMember: (m: Member) => void;
}) {
  if (!message) return null;
  const { read, unread } = split;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="animate-fade-in absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-sheet-up relative max-h-[80vh] overflow-y-auto rounded-t-[1.75rem] bg-[#f2f4f7] pb-[max(1.25rem,var(--safe-bottom))]">
        <div className="sticky top-0 flex justify-center bg-[#f2f4f7]/90 pt-3 backdrop-blur">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2 pt-2">
          <h2 className="text-xl font-bold">
            既読 {read.length}
            <span className="ml-1 text-sm font-normal text-slate-400">
              / {read.length + unread.length}人
            </span>
          </h2>
          <button
            onClick={onClose}
            className="tap-shrink rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-600"
          >
            閉じる
          </button>
        </div>

        <div className="px-4 pb-2">
          {read.length > 0 && (
            <Section title={`既読（${read.length}）`} members={read} onTap={onTapMember} />
          )}
          {unread.length > 0 && (
            <Section title={`未読（${unread.length}）`} members={unread} onTap={onTapMember} dim />
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  members,
  onTap,
  dim,
}: {
  title: string;
  members: Member[];
  onTap: (m: Member) => void;
  dim?: boolean;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 ml-1 text-xs font-bold text-slate-400">{title}</p>
      <div className="overflow-hidden rounded-2xl bg-white">
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => onTap(m)}
            className={cn(
              "flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left last:border-0 active:bg-slate-50",
              dim && "opacity-60"
            )}
          >
            <Avatar name={m.name} size={32} />
            <span className="font-semibold">{m.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
