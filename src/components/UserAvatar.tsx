import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/avatar";

type Props = {
  /** Stable seed — user id preferred, falls back to name/email. */
  seed?: string | null;
  /** Display name — used for initial fallback while image loads. */
  name?: string | null;
  /** Optional user-uploaded avatar; when provided it overrides the generated one. */
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: number;
};

export function UserAvatar({ seed, name, src, className, fallbackClassName, size = 96 }: Props) {
  const key = (seed ?? name ?? "guest") || "guest";
  const url = src && src.length > 0 ? src : getAvatarUrl(key, size);
  const initial = (name ?? "?").trim().slice(0, 1).toUpperCase() || "?";
  return (
    <Avatar className={className}>
      <AvatarImage src={url} alt={name ?? "Üye"} />
      <AvatarFallback className={cn("bg-brand text-brand-foreground font-semibold", fallbackClassName)}>
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
