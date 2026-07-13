import { supabase } from "@/integrations/supabase/client";

type Level = "error" | "warn" | "info";
type LogInput = {
  level?: Level;
  source?: string;
  message: string;
  context?: Record<string, unknown> | null;
  url?: string;
};

let installed = false;

async function send(entry: LogInput) {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id ?? null;
    await supabase.from("app_logs" as never).insert({
      level: entry.level ?? "error",
      source: entry.source ?? "client",
      message: entry.message.slice(0, 4000),
      context: entry.context ?? null,
      url: entry.url ?? (typeof window !== "undefined" ? window.location.href : null),
      user_id: userId,
    } as never);
  } catch {
    // never throw from logger
  }
}

export const appLog = {
  error: (message: string, context?: Record<string, unknown>) =>
    send({ level: "error", message, context }),
  warn: (message: string, context?: Record<string, unknown>) =>
    send({ level: "warn", message, context }),
  info: (message: string, context?: Record<string, unknown>) =>
    send({ level: "info", message, context }),
};

export function installGlobalErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    send({
      level: "error",
      source: "window.error",
      message: e.message || "Unknown error",
      context: {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack?.slice(0, 2000),
      },
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    send({
      level: "error",
      source: "unhandledrejection",
      message: typeof reason === "string" ? reason : reason?.message || "Unhandled rejection",
      context: { stack: reason?.stack?.slice(0, 2000) },
    });
  });
}
