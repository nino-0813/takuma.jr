import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, inputClass } from "@/components/ui";

export default function Welcome() {
  const nav = useNavigate();
  const [code, setCode] = useState("");

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pt-[calc(4rem+var(--safe-top))]">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-pitch-600 text-4xl shadow-lg">
          ⚽️
        </div>
        <h1 className="text-3xl font-bold tracking-tight">チームつながる</h1>
        <p className="mt-2 leading-relaxed text-slate-500">
          試合の参加表明・鍵当番・予定を
          <br />
          チームみんなで共有できるアプリ
        </p>
      </div>

      <div className="mt-12 space-y-3">
        <Button className="w-full" onClick={() => nav("/create")}>
          新しいチームを作る
        </Button>

        <div className="flex items-center gap-3 py-2 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          または招待コードで参加
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <input
          className={inputClass + " text-center text-xl font-bold tracking-[0.3em] uppercase"}
          placeholder="ABC123"
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
        />
        <Button
          variant="secondary"
          className="w-full"
          disabled={code.length < 4}
          onClick={() => nav(`/join/${code}`)}
        >
          参加する
        </Button>
      </div>

      <p className="mt-auto pb-8 pt-10 text-center text-xs text-slate-300">
        招待リンクを受け取った場合は、そのリンクを開くだけで参加できます
      </p>
    </div>
  );
}
