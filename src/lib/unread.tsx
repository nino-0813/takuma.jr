import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import { useSession } from "./session";

interface UnreadValue {
  count: number;
  clear: () => void;
}

const Ctx = createContext<UnreadValue>({ count: 0, clear: () => {} });

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { team, member } = useSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!team || !member) return;
    let active = true;

    (async () => {
      const { data: cr } = await supabase
        .from("chat_reads")
        .select("last_read_at")
        .eq("team_id", team.id)
        .eq("member_id", member.id)
        .maybeSingle();
      const last = cr?.last_read_at ?? "1970-01-01T00:00:00Z";
      const { count: c } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id)
        .neq("member_id", member.id)
        .gt("created_at", last);
      if (active) setCount(c ?? 0);
    })();

    const channel = supabase
      .channel(`unread:${team.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `team_id=eq.${team.id}`,
        },
        (payload) => {
          const m = payload.new as { member_id: string | null };
          if (m.member_id !== member.id) setCount((x) => x + 1);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [team?.id, member?.id]);

  const clear = useCallback(() => setCount(0), []);

  return <Ctx.Provider value={{ count, clear }}>{children}</Ctx.Provider>;
}

export const useUnread = () => useContext(Ctx);
