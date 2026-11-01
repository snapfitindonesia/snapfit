import type { ReactNode } from 'react';

export type IconName = 'z' | 'grid' | 'search' | 'user' | 'heart' | 'bag' | 'phone' | 'close' | 'check' | 'truck' | 'return';
const shapes: Record<IconName, ReactNode> = {
  z: <path d="M5 5h14L5 19h14" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/></>,
  search: <><circle cx="10.8" cy="10.8" r="7.8"/><path d="m16.5 16.5 5 5"/></>,
  user: <><circle cx="12" cy="8" r="5.4"/><path d="M2.8 21c1.5-5 5-7.2 9.2-7.2s7.7 2.2 9.2 7.2"/></>,
  heart: <path d="M12 21S2 15 2 8.7C2 2.5 9.2 1.3 12 6c2.8-4.7 10-3.5 10 2.7C22 15 12 21 12 21Z"/>,
  bag: <><path d="M4 7h16l1.5 14h-19L4 7Z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="1.5"/><path d="M6 18h12"/></>,
  close: <path d="m5 5 14 14M19 5 5 19"/>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/></>,
  truck: <><path d="M2 5h12v12H2V5ZM14 9h4l4 5v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  return: <path d="M4 8a9 9 0 1 1-1 8M4 2v6h6"/>,
};
export default function Icon({ name, className }: { name: IconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}
