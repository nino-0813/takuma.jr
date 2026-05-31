import { useEffect, useMemo, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Avatar, Spinner } from "@/components/ui";
import { ChatIcon, SendIcon } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import type { Member, Message } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";

export default function Chat() {
  const { team, member } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const memberMap = useMemo(() => {
    const m = new Map<string, Member>();
    members.forEach((x) => m.set(x.id, x));
    return m;
  }, [members]);

  function scrollToBottom(smooth = false) {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }

  // 初期ロード
  useEffect(() => {
    if (!team) return;
    let active = true;
    (async () => {
      const [{ data: msgs }, { data: ms }] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .eq("team_id", team.id)
          .order("created_at", { ascending: true })
          .limit(300),
        supabase.from("members").select("*").eq("team_id", team.id),
      ]);
      if (!active) return;
      setMessages((msgs as Message[]) ?? []);
      setMembers((ms as Member[]) ?? []);
      setLoading(false);
      setTimeout(() => scrollToBottom(), 50);
    })();
    return () => {
      active = false;
    };
  }, [team?.id]);

  // リアルタイム購読（新着メッセージを即反映）
  useEffect(() => {
    if (!team) return;
    const channel = supabase
      .channel(`messages:${team.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `team_id=eq.${team.id}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [team?.id]);

  // メッセージが増えたら一番下へ
  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

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
      setText(body); // 失敗時は戻す
      return;
    }
    // リアルタイムが届かない環境でも表示されるよう、重複回避して追加
    if (data) {
      const m = data as Message;
      setMessages((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, m]
      );
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 px-5 pb-3 pt-[calc(0.9rem+var(--safe-top))] backdrop-blur-xl">
        <h1 className="text-xl font-bold">チャット</h1>
        <p className="text-xs text-slate-400">{team?.name}・みんなの連絡</p>
      </header>

      {/* メッセージ一覧 */}
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
            const showName =
              !mine && (!prev || prev.member_id !== m.member_id);
            const newDay =
              !prev || !isSameDay(new Date(prev.created_at), new Date(m.created_at));
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
                      {showName && (
                        <Avatar name={author?.name ?? "?"} size={28} />
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex max-w-[72%] flex-col",
                      mine ? "items-end" : "items-start"
                    )}
                  >
                    {showName && (
                      <span className="mb-0.5 ml-1 text-[11px] text-slate-400">
                        {author?.name ?? "退会したメンバー"}
                      </span>
                    )}
                    <div className="flex items-end gap-1.5">
                      {mine && (
                        <span className="mb-0.5 text-[10px] text-slate-400">
                          {format(new Date(m.created_at), "HH:mm")}
                        </span>
                      )}
                      <div
                        className={cn(
                          "whitespace-pre-wrap break-words rounded-[1.15rem] px-3.5 py-2 text-[15px] leading-relaxed",
                          mine
                            ? "rounded-br-md bg-pitch-600 text-white"
                            : "rounded-bl-md bg-white text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                        )}
                      >
                        {m.body}
                      </div>
                      {!mine && (
                        <span className="mb-0.5 text-[10px] text-slate-400">
                          {format(new Date(m.created_at), "HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力バー（タブバーの上に固定） */}
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
    </div>
  );
}
