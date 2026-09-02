import type { TaskStatus, PaintProject, Floor, Room, FinishingStep, OrderStatus } from './types';

export interface StatusStyle {
  badge: string;
  dot: string;
  label: string;
}

export const STATUS_STYLES: Record<TaskStatus, StatusStyle> = {
  COMPLETED: {
    badge:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 ring-1 ring-emerald-600/20 dark:ring-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Completed',
  },
  IN_PROGRESS: {
    badge:
      'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 ring-1 ring-amber-600/20 dark:ring-amber-500/30',
    dot: 'bg-amber-500',
    label: 'In Progress',
  },
  PENDING: {
    badge:
      'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 ring-1 ring-slate-500/20 dark:ring-slate-500/30',
    dot: 'bg-slate-400',
    label: 'Pending',
  },
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, StatusStyle> = {
  PENDING_STORE_ORDER: {
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 ring-1 ring-slate-500/20',
    dot: 'bg-slate-400',
    label: 'Pending Store Order',
  },
  ORDERED: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 ring-1 ring-amber-600/20',
    dot: 'bg-amber-500',
    label: 'Ordered',
  },
  DELIVERED_AT_SITE: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 ring-1 ring-emerald-600/20',
    dot: 'bg-emerald-500',
    label: 'Delivered at Site',
  },
};

export function fmtNum(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US');
}

export function fmtPct(part: number, whole: number): string {
  if (!whole) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}

export function fmtINR(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

export interface ProjectMetrics {
  interiorSqft: number;
  exteriorSqft: number;
  doorsWindowsQty: number;
  materialCount: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overallPct: number;
}

export function computeMetrics(project: PaintProject): ProjectMetrics {
  let interiorSqft = 0;
  let exteriorSqft = 0;
  let doorsWindowsQty = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let pendingTasks = 0;

  for (const floor of project.floors ?? []) {
    for (const room of floor.rooms ?? []) {
      interiorSqft += room.interiorSqft ?? 0;
      exteriorSqft += room.exteriorSqft ?? 0;
      doorsWindowsQty += (room.doorsCount ?? 0) + (room.windowsCount ?? 0);
      for (const step of room.finishingSteps ?? []) {
        totalTasks += 1;
        if (step.status === 'COMPLETED') completedTasks += 1;
        else if (step.status === 'IN_PROGRESS') inProgressTasks += 1;
        else pendingTasks += 1;
      }
    }
  }

  const sm = project.summaryMetrics ?? {};
  const ew = project.exteriorWork ?? {};

  return {
    interiorSqft: sm.totalInteriorSqft ?? interiorSqft,
    exteriorSqft: sm.totalExteriorSqft ?? ew.totalAreaSqft ?? exteriorSqft,
    doorsWindowsQty: sm.totalDoorsWindowsQty ?? doorsWindowsQty,
    materialCount: project.materialBillOfQuantities?.length ?? 0,
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    overallPct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };
}

export function allRooms(project: PaintProject): { floor: Floor; room: Room }[] {
  const out: { floor: Floor; room: Room }[] = [];
  for (const floor of project.floors ?? []) {
    for (const room of floor.rooms ?? []) {
      out.push({ floor, room });
    }
  }
  return out;
}

export function findStep(
  project: PaintProject,
  floorId: string,
  roomId: string,
  stepId: string,
): FinishingStep | undefined {
  for (const floor of project.floors ?? []) {
    if (floor.id !== floorId) continue;
    for (const room of floor.rooms ?? []) {
      if (room.id !== roomId) continue;
      return room.finishingSteps?.find((s) => s.id === stepId);
    }
  }
  return undefined;
}

export function progressToStatus(pct: number): TaskStatus {
  if (pct >= 100) return 'COMPLETED';
  if (pct > 0) return 'IN_PROGRESS';
  return 'PENDING';
}

export function statusToProgress(status: TaskStatus): number {
  if (status === 'COMPLETED') return 100;
  if (status === 'IN_PROGRESS') return 50;
  return 0;
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
