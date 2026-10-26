import { Award, FileCheck, Globe, GraduationCap, Landmark, Layers, School, type LucideIcon } from 'lucide-react';

// Server (/pricing kartasi) va client (obuna kartochkasi) bir xil ikonni olsin —
// 'use client' modulidan konstanta server komponentga import qilinmaydi.
export const GOAL_ICONS: Record<string, LucideIcon> = {
  ATTESTATION: Award, CERTIFICATE: FileCheck, DTM: GraduationCap, SCHOOL: School,
  PRESIDENT_SCHOOL: Landmark, SAT: Globe, GRE: Globe,
};

export function goalIcon(goal: string | null, isBundle = false): LucideIcon {
  if (isBundle) return Layers;
  return (goal && GOAL_ICONS[goal]) || Layers;
}
