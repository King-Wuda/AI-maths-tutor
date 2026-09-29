"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/client";

export function PageView() {
  const path = usePathname();
  useEffect(() => {
    if (!path.startsWith("/admin")) track("page_view", { value: path });
  }, [path]);
  return null;
}
