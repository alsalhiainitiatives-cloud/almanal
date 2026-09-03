/**
 * Shared user avatar.
 *
 * `src` accepts either an absolute URL (external picture) or an internal
 * storage path inside the private `classroom-media` bucket (`avatars/<uid>/…`),
 * which is signed on the client before display. Falls back to the first letter
 * of the name so every surface looks intentional even without a picture.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClassroomMediaUrls } from "@/lib/classroom-media";
import { cn } from "@/lib/utils";

const ABSOLUTE = /^(https?:|data:|blob:)/i;

export function avatarInitial(name?: string | null) {
  const clean = (name ?? "").trim();
  return clean ? clean.slice(0, 1) : "؟";
}

export function UserAvatar({
  name,
  src,
  className,
  fallbackClassName,
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const value = (src ?? "").trim();
  const isPath = Boolean(value) && !ABSOLUTE.test(value);
  const urls = useClassroomMediaUrls(isPath ? [value] : []);
  const resolved = isPath ? urls[value] : value || undefined;

  return (
    <Avatar className={cn("size-9 border border-border/60", className)}>
      {resolved ? <AvatarImage src={resolved} alt={name ?? "صورة المستخدم"} /> : null}
      <AvatarFallback
        className={cn("bg-primary/10 text-xs font-black text-primary", fallbackClassName)}
      >
        {avatarInitial(name)}
      </AvatarFallback>
    </Avatar>
  );
}
