"use client";
import type { EventType } from "./types";

type Payload = { topic_id?: number; question_id?: number; exam_id?: string; value?: string };

/** Fire-and-forget event logging. Also bumps a local attempt counter for the lead prompt. */
export function track(event_type: EventType, p: Payload = {}) {
  try {
    fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event_type, ...p }),
      keepalive: true,
    }).catch(() => {});
    if (event_type === "self_mark") {
      const n = Number(localStorage.getItem("mt_attempts") ?? 0) + 1;
      localStorage.setItem("mt_attempts", String(n));
    }
    if (event_type === "exam_completed") localStorage.setItem("mt_exam_done", "1");
    if (event_type === "self_mark" || event_type === "exam_completed") window.dispatchEvent(new Event("mt:progress"));
  } catch {}
}
