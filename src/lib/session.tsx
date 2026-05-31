import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import type { Member, Team } from "./types";

const STORAGE_KEY = "tc.session.v1";

interface StoredSession {
  teamId: string;
  memberId: string;
}

interface SessionValue {
  loading: boolean;
  team: Team | null;
  member: Member | null;
  isAdmin: boolean;
  signIn: (teamId: string, memberId: string) => void;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

function read(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [member, setMember] = useState<Member | null>(null);

  async function load(stored: StoredSession | null) {
    if (!stored) {
      setTeam(null);
      setMember(null);
      setLoading(false);
      return;
    }
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from("teams").select("*").eq("id", stored.teamId).maybeSingle(),
      supabase
        .from("members")
        .select("*")
        .eq("id", stored.memberId)
        .maybeSingle(),
    ]);
    if (!t || !m) {
      // 削除済みなどで無効化されたセッション
      localStorage.removeItem(STORAGE_KEY);
      setTeam(null);
      setMember(null);
    } else {
      setTeam(t as Team);
      setMember(m as Member);
    }
    setLoading(false);
  }

  useEffect(() => {
    load(read());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = (teamId: string, memberId: string) => {
    const s: StoredSession = { teamId, memberId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setLoading(true);
    load(s);
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTeam(null);
    setMember(null);
  };

  const refresh = async () => {
    await load(read());
  };

  return (
    <SessionContext.Provider
      value={{
        loading,
        team,
        member,
        isAdmin: member?.role === "admin",
        signIn,
        signOut,
        refresh,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
