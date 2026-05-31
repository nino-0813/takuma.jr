import { useState } from "react";
import { Avatar, Button, Sheet } from "./ui";
import ProfileSheet from "./ProfileSheet";
import { useSession } from "@/lib/session";
import type { Member } from "@/lib/types";

/** メンバーの情報を表示するシート（アイコンタップで開く） */
export default function MemberSheet({
  member,
  onClose,
  onUpdated,
}: {
  member: Member | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const { member: me } = useSession();
  const [editing, setEditing] = useState(false);
  const isMe = !!member && member.id === me?.id;

  return (
    <>
      <Sheet open={!!member && !editing} onClose={onClose} title="">
        {member && (
          <div className="pb-4">
            <div className="flex flex-col items-center pb-4 pt-2">
              <Avatar name={member.name} size={84} />
              <h2 className="mt-3 text-xl font-bold">{member.name}</h2>
              <span
                className={
                  "mt-1 rounded-full px-2.5 py-0.5 text-xs font-bold " +
                  (member.role === "admin"
                    ? "bg-pitch-100 text-pitch-700"
                    : "bg-slate-100 text-slate-500")
                }
              >
                {member.role === "admin" ? "管理者" : "メンバー"}
                {isMe && "・あなた"}
              </span>
            </div>

            <div className="space-y-2">
              <InfoLine label="お子さん" value={member.child_name} />
              <InfoLine
                label="背番号"
                value={member.jersey_number != null ? `#${member.jersey_number}` : null}
              />
              <InfoLine label="連絡先" value={member.phone} phone />
            </div>

            {isMe && (
              <Button
                variant="secondary"
                className="mt-5 w-full"
                onClick={() => setEditing(true)}
              >
                プロフィールを編集
              </Button>
            )}
          </div>
        )}
      </Sheet>

      <ProfileSheet
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onUpdated?.();
          onClose();
        }}
      />
    </>
  );
}

function InfoLine({
  label,
  value,
  phone,
}: {
  label: string;
  value: string | null;
  phone?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <span className="text-sm font-semibold text-slate-400">{label}</span>
      {value ? (
        phone ? (
          <a href={`tel:${value}`} className="font-semibold text-pitch-600">
            {value}
          </a>
        ) : (
          <span className="font-semibold">{value}</span>
        )
      ) : (
        <span className="text-sm text-slate-300">未登録</span>
      )}
    </div>
  );
}
