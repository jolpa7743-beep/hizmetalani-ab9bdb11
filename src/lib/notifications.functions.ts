import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationRow = {
  id: string;
  kind: "message" | "review" | "promotion" | "system";
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications" as never)
      .select("id, kind, title, body, link, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as NotificationRow[];
  });

export const getUnreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("notifications_unread_count" as never);
    if (error) throw new Error(error.message);
    return Number(data ?? 0);
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids?: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("mark_notifications_read" as never, {
      _ids: data.ids ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
