import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check, MessageSquare, Star, Sparkles, Info } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  listMyNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  type NotificationRow,
} from "@/lib/notifications.functions";

function iconFor(kind: NotificationRow["kind"]) {
  switch (kind) {
    case "message":   return <MessageSquare className="size-4 text-brand" />;
    case "review":    return <Star className="size-4 text-amber-500" />;
    case "promotion": return <Sparkles className="size-4 text-fuchsia-500" />;
    default:          return <Info className="size-4 text-muted-foreground" />;
  }
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} sn`;
  if (s < 3600) return `${Math.floor(s / 60)} dk`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa`;
  return `${Math.floor(s / 86400)} gün`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const fetchList = useServerFn(listMyNotifications);
  const fetchCount = useServerFn(getUnreadNotificationCount);
  const markRead = useServerFn(markNotificationsRead);

  const { data: unread = 0 } = useQuery({
    queryKey: ["notif-unread"],
    queryFn: () => fetchCount(),
    refetchInterval: 60_000,
  });

  const { data: list = [] } = useQuery({
    queryKey: ["notif-list"],
    queryFn: () => fetchList(),
    enabled: open,
    staleTime: 15_000,
  });

  const handleMarkAll = async () => {
    await markRead({ data: {} });
    qc.invalidateQueries({ queryKey: ["notif-unread"] });
    qc.invalidateQueries({ queryKey: ["notif-list"] });
  };

  const handleClickItem = async (n: NotificationRow) => {
    if (!n.is_read) {
      await markRead({ data: { ids: [n.id] } });
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
      qc.invalidateQueries({ queryKey: ["notif-list"] });
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-muted transition-colors"
          aria-label={`Bildirimler${unread > 0 ? ` (${unread} okunmamış)` : ""}`}
        >
          <Bell className="size-5" aria-hidden />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-surface animate-in zoom-in">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold text-sm">Bildirimler</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAll}>
              <Check className="size-3.5 mr-1" /> Tümünü okundu
            </Button>
          )}
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {list.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Henüz bildirim yok.
            </div>
          )}
          {list.map((n) => {
            const body = (
              <div className={`flex gap-3 px-3 py-2.5 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${!n.is_read ? "bg-brand/5" : ""}`}>
                <div className="mt-0.5">{iconFor(n.kind)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">{timeAgo(n.created_at)} önce</div>
                </div>
                {!n.is_read && <span className="mt-1.5 size-2 rounded-full bg-brand shrink-0" />}
              </div>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} onClick={() => handleClickItem(n)} className="block">
                {body}
              </Link>
            ) : (
              <button key={n.id} onClick={() => handleClickItem(n)} className="block w-full text-left">
                {body}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
