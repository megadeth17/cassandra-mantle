"use client";
import { useEffect, useState } from "react";

export function useSSE(url: string, max = 12) {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try { const data = JSON.parse(e.data); setEvents((prev) => [data, ...prev].slice(0, max)); } catch {}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [url, max]);
  return events;
}
