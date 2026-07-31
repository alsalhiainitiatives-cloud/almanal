import {
  BookOpenText,
  Building2,
  Compass,
  Facebook,
  GraduationCap,
  HeartHandshake,
  Heart,
  Instagram,
  Linkedin,
  Palette,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Twitter,
  Users,
  Youtube,
  type LucideIcon,
} from "lucide-react";

export const SITE_ICONS: Record<string, LucideIcon> = {
  BookOpenText,
  Building2,
  Compass,
  Facebook,
  GraduationCap,
  Heart,
  HeartHandshake,
  Instagram,
  Linkedin,
  Palette,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Twitter,
  Users,
  Youtube,
};

export const SITE_ICON_NAMES = Object.keys(SITE_ICONS);

export function siteIcon(name: string | undefined): LucideIcon {
  return (name && SITE_ICONS[name]) || Sparkles;
}