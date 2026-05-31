import { useEffect, useState } from "react";
import { Avatar, Button, Field, Sheet, inputClass } from "./ui";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

/** マイページ：自分のプロフィールを登録・編集するシート */
export default function ProfileSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { member, refresh } = useSession();
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
    await refresh();
    onSaved?.();
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="マイページ">
      <div className="space-y-4 pb-2">
        <div className="flex flex-col items-center py-2">
          <Avatar name={name || member?.name || "?"} size={72} />
          <p className="mt-2 text-xs text-slate-400">
            アイコンは名前から自動で作られます
          </p>
        </div>

        <Field label="あなたの名前（保護者）">
          <input
            className={inputClass}
            placeholder="例）山田（太郎の母）"
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
              inputMode="numeric"
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
          {busy ? "保存中…" : "保存する"}
        </Button>
      </div>
    </Sheet>
  );
}
