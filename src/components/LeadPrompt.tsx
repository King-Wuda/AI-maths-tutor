"use client";
import { useEffect, useState } from "react";

const safe = <T,>(f: () => T, d: T): T => { try { return f(); } catch { return d; } };

export function LeadPrompt() {
  const [show, setShow] = useState(false);
  const [role, setRole] = useState("learner");
  const [contact, setContact] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const check = () => {
      if (safe(() => localStorage.getItem("mt_lead_closed"), null)) return;
      const n = Number(safe(() => localStorage.getItem("mt_attempts"), "0"));
      const exam = safe(() => localStorage.getItem("mt_exam_done"), null);
      if (n >= 5 || exam) setShow(true);
    };
    check();
    window.addEventListener("mt:progress", check);
    return () => window.removeEventListener("mt:progress", check);
  }, []);

  const close = () => {
    safe(() => localStorage.setItem("mt_lead_closed", "1"), null);
    setShow(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const isEmail = contact.includes("@");
    const res = await fetch("/api/lead", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, email: isEmail ? contact : "", whatsapp: isEmail ? "" : contact }),
    });
    if (res.ok) { setDone(true); safe(() => localStorage.setItem("mt_lead_closed", "1"), null); setTimeout(() => setShow(false), 2500); }
    else setMsg((await res.json()).error ?? "Something went wrong");
  }

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white p-4 shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-96 sm:rounded-xl sm:border">
      {done ? (
        <p className="text-sm font-medium text-green-700">Thanks! We&apos;ll be in touch when it launches.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">Want new AI practice tests on your weak topics when they launch? Leave your email or WhatsApp.</p>
            <button type="button" onClick={close} aria-label="Dismiss" className="text-xl leading-none text-slate-500">×</button>
          </div>
          <div className="flex gap-2 text-sm">
            {["learner", "parent", "teacher"].map((r) => (
              <label key={r} className={`flex-1 cursor-pointer rounded border px-2 py-1.5 text-center capitalize ${role === r ? "border-blue-600 bg-blue-50" : ""}`}>
                <input type="radio" className="sr-only" checked={role === r} onChange={() => setRole(r)} />{r}
              </label>
            ))}
          </div>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or WhatsApp number"
            className="w-full rounded border px-3 py-2 text-sm" required />
          {msg && <p className="text-xs text-red-600">{msg}</p>}
          <button className="w-full rounded bg-blue-600 py-2 text-sm font-semibold text-white">Notify me</button>
        </form>
      )}
    </div>
  );
}
