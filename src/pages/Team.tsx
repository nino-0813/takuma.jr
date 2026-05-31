import { useEffect, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import {
  Avatar,
  Button,
  Card,
  Field,
  Sheet,
  Spinner,
  inputClass,
} from "@/components/ui";
import { LogoutIcon, ShareIcon, UsersIcon } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Team() {
  const { team, member, isAdmin, signOut, refresh } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    if (!team) return;
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at");
    setMembers((data as Member[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id]);

  const inviteUrl = `${location.origin}/join/${team?.invite_code}`;

  async function share() {
    const text = `「${team?.name}」に参加しよう！\n${inviteUrl}\n（招待コード: ${team?.invite_code}）`;
    if (navigator.share) {
      try {
        await navigator.share({ title: team?.name, text, url: inviteUrl });
        return;
      } catch {
        /* キャンセル */
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function toggleAdmin(m: Member) {
    if (!isAdmin || m.id === member?.id) return;
    await supabase
      .from("members")
      .update({ role: m.role === "admin" ? "member" : "admin" })
      .eq("id", m.id);
    load();
  }

  return (
    <div>
      <PageHeader title="チーム" subtitle={team?.name} />

      <div className="space-y-4 px-4">
        {/* 招待カード */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-pitch-500 to-pitch-700 p-5 text-white">
            <p className="text-sm opacity-90">招待コード</p>
            <p className="mt-1 text-4xl font-bold tracking-[0.3em]">
              {team?.invite_code}
            </p>
          </div>
          <div className="p-3">
            <Button className="w-full" onClick={share}>
              <ShareIcon width={18} height={18} />
              {copied ? "コピーしました！" : "招待リンクを共有"}
            </Button>
            <p className="mt-2 px-2 text-center text-xs text-slate-400">
              このリンクをLINEなどで送ると、名前を入れるだけで参加できます
            </p>
          </div>
        </Card>

        {/* 自分のプロフィール */}
        <Card
          onClick={() => setShowProfile(true)}
          className="tap-shrink flex cursor-pointer items-center gap-3 p-3.5"
        >
          <Avatar name={member?.name ?? ""} size={48} />
          <div className="flex-1">
            <p className="font-bold">{member?.name}</p>
            <p className="text-xs text-slate-400">
              {isAdmin ? "管理者" : "メンバー"}・タップで編集
            </p>
          </div>
        </Card>

        {/* メンバー一覧 */}
        <section>
          <h2 className="mb-2 ml-1 flex items-center gap-1.5 text-sm font-bold text-slate-500">
            <UsersIcon width={16} height={16} />
            メンバー（{members.length}人）
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <Card className="divide-y divide-slate-100">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={m.name} size={40} />
                  <div className="flex-1">
                    <p className="font-semibold">
                      {m.name}
                      {m.id === member?.id && (
                        <span className="ml-1 text-xs text-pitch-600">
                          (あなた)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {m.child_name && `${m.child_name} `}
                      {m.jersey_number != null && `#${m.jersey_number} `}
                      {m.phone && `・${m.phone}`}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleAdmin(m)}
                    disabled={!isAdmin || m.id === member?.id}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-bold",
                      m.role === "admin"
                        ? "bg-pitch-100 text-pitch-700"
                        : "bg-slate-100 text-slate-400",
                      isAdmin && m.id !== member?.id && "tap-shrink"
                    )}
                  >
                    {m.role === "admin" ? "管理者" : "メンバー"}
                  </button>
                </div>
              ))}
            </Card>
          )}
          {isAdmin && (
            <p className="mt-2 px-2 text-center text-xs text-slate-400">
              役割バッジをタップで管理者の切り替えができます
            </p>
          )}
        </section>

        <button
          onClick={() => {
            if (confirm("ログアウトしますか？再参加には招待コードが必要です。")) {
              signOut();
            }
          }}
          className="tap-shrink flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-red-500"
        >
          <LogoutIcon width={18} height={18} />
          ログアウト
        </button>
      </div>

      <ProfileSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        onSaved={async () => {
          setShowProfile(false);
          await refresh();
          load();
        }}
      />
    </div>
  );
}

function ProfileSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { member } = useSession();
  const [name, setName] = useState("");
  const [childName, setChildName] = useState("");
  const [jersey, setJersey] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && member) {
      setName(member.name);
      setChildName(member.child_name ?? "");
      setJersey(member.jersey_number != null ? String(member.jersey_number) : "");
      setPhone(member.phone ?? "");
    }
  }, [open, member]);

  async function save() {
    if (!member || !name.trim()) return;
    setBusy(true);
    await supabase
      .from("members")
      .update({
        name: name.trim(),
        child_name: childName.trim() || null,
        jersey_number: jersey ? Number(jersey) : null,
        phone: phone.trim() || null,
      })
      .eq("id", member.id);
    setBusy(false);
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="プロフィール編集">
      <div className="space-y-4 pb-2">
        <Field label="あなたの名前">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="お子さんの名前（任意）">
          <input
            className={inputClass}
            placeholder="例）太郎"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="背番号（任意）">
            <input
              type="number"
              className={inputClass}
              placeholder="10"
              value={jersey}
              onChange={(e) => setJersey(e.target.value)}
            />
          </Field>
          <Field label="連絡先（任意）">
            <input
              type="tel"
              className={inputClass}
              placeholder="090-..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        </div>
        <Button className="w-full" disabled={busy || !name.trim()} onClick={save}>
          {busy ? "保存中…" : "保存"}
        </Button>
      </div>
    </Sheet>
  );
}
