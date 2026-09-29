"use client";
import { useState } from "react";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) window.location.href = "/admin/review"; else setErr("Wrong password");
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-xs space-y-3">
      <h1 className="text-xl font-bold">Admin</h1>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="Password" />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="w-full rounded bg-blue-600 py-2 font-semibold text-white">Sign in</button>
    </form>
  );
}
