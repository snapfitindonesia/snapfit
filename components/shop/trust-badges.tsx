import { ShieldCheck, BadgeCheck, RotateCcw } from "lucide-react";

const BADGES = [
  { icon: ShieldCheck, label: "Garansi Resmi" },
  { icon: BadgeCheck, label: "100% Original" },
  { icon: RotateCcw, label: "7 Hari Pengembalian" },
];

export function TrustBadges() {
  return (
    <ul className="grid grid-cols-3 gap-3 rounded-lg border border-border p-4">
      {BADGES.map(({ icon: Icon, label }) => (
        <li key={label} className="flex flex-col items-center gap-2 text-center">
          <Icon className="size-5" />
          <span className="text-xs font-medium leading-tight">{label}</span>
        </li>
      ))}
    </ul>
  );
}
