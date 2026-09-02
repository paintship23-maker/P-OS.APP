import type { TaskStatus, PaintProject, Floor, Room, FinishingStep, OrderStatus, ExteriorSide } from './types';

export interface StatusStyle {
  badge: string;
  dot: string;
  label: string;
}

export const STATUS_STYLES: Record<string, StatusStyle> = {
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
  NOT_STARTED: {
    badge:
      'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 ring-1 ring-slate-500/20 dark:ring-slate-500/30',
    dot: 'bg-slate-400',
    label: 'Not Started',
  },
  ASSIGNED: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 ring-1 ring-blue-600/20 dark:ring-blue-500/30',
    dot: 'bg-blue-500',
    label: 'Assigned',
  },
  PAUSED: {
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 ring-1 ring-slate-500/20 dark:ring-slate-500/30',
    dot: 'bg-slate-400',
    label: 'Paused',
  },
  PENDING_INSPECTION: {
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 ring-1 ring-orange-600/20 dark:ring-orange-500/30',
    dot: 'bg-orange-500',
    label: 'Pending Inspection',
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

export function compressImageBase64(
  base64Str: string,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      if (compressedDataUrl.length > 500 * 1024) {
        compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      }
      resolve(compressedDataUrl);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

export function cleanupStaleBase64FromStorage(key = 'paintship_projects') {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;

    // Check size in bytes (approximate)
    const sizeInMB = raw.length / (1024 * 1024);
    if (sizeInMB < 3.5) return; // Cleanup only when storage is large (> 3.5MB / close to 5MB)

    const projects: PaintProject[] = JSON.parse(raw);
    let modified = false;

    const cleanedProjects = projects.map((proj) => ({
      ...proj,
      floors: (proj.floors ?? []).map((floor) => ({
        ...floor,
        rooms: (floor.rooms ?? []).map((room) => ({
          ...room,
          finishingSteps: (room.finishingSteps ?? []).map((step) => {
            const cleanStep = { ...step };
            if (cleanStep.beforePhotoUrl?.startsWith('data:image')) {
              cleanStep.beforePhotoUrl = undefined;
              modified = true;
            }
            if (cleanStep.beforePhoto?.startsWith('data:image')) {
              cleanStep.beforePhoto = undefined;
              modified = true;
            }
            if (cleanStep.afterPhotoUrl?.startsWith('data:image')) {
              cleanStep.afterPhotoUrl = undefined;
              modified = true;
            }
            if (cleanStep.afterPhoto?.startsWith('data:image')) {
              cleanStep.afterPhoto = undefined;
              modified = true;
            }
            if (cleanStep.completionPhoto?.startsWith('data:image')) {
              cleanStep.completionPhoto = undefined;
              modified = true;
            }
            if (cleanStep.proofPhotos?.some((p) => p.startsWith('data:image'))) {
              cleanStep.proofPhotos = cleanStep.proofPhotos.filter((p) => !p.startsWith('data:image'));
              modified = true;
            }
            return cleanStep;
          }),
        })),
      })),
    }));

    if (modified) {
      try {
        localStorage.setItem(key, JSON.stringify(cleanedProjects));
        console.warn('[LocalStorage Cleanup] Purged heavy Base64 images to free up space.');
      } catch (e) {
        console.warn('[LocalStorage Cleanup] Failed to write cleaned projects back to localStorage:', e);
      }
    }
  } catch (err) {
    console.warn('[LocalStorage Cleanup] Error during cleanup:', err);
  }
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
    const exteriorZone = isExteriorFloor(floor);
    for (const room of floor.rooms ?? []) {
      const isExteriorRoom = exteriorZone || Boolean(room.isExterior);
      if (isExteriorRoom) {
        exteriorSqft += getRoomArea(room, true);
      } else {
        interiorSqft += room.interiorSqft ?? 0;
        exteriorSqft += room.exteriorSqft ?? 0;
      }
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
    const exteriorFromSides = (ew.sides ?? []).reduce((sum, s) => sum + (s.areaSqft ?? 0), 0);

    return {
      interiorSqft: sm.totalInteriorSqft !== undefined ? sm.totalInteriorSqft : interiorSqft,
      exteriorSqft: sm.totalExteriorSqft !== undefined ? sm.totalExteriorSqft : ew.totalAreaSqft !== undefined ? ew.totalAreaSqft : exteriorFromSides > 0 ? exteriorFromSides : exteriorSqft,
      doorsWindowsQty: sm.totalDoorsWindowsQty != null ? Number(sm.totalDoorsWindowsQty) : doorsWindowsQty,
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

/* ---------------------------------------------------------------------------
 * Area resolution — never return a hardcoded 0 when real measurements exist.
 * ------------------------------------------------------------------------- */

/**
 * Real measured area of a room / exterior side in sqft.
 * Walks every measurement alias produced by the JSON parser and demo data so
 * dropdowns and target allocators never fall back to a bogus "0 sqft".
 */
export function getRoomArea(room?: Partial<Room> | null, isExterior = false): number {
  if (!room) return 0;
  const candidates = isExterior
    ? [room.exteriorSqft, room.totalSqft, room.interiorSqft, room.netWallSqft, room.sqft]
    : [room.interiorSqft, room.totalSqft, room.exteriorSqft, room.netWallSqft, room.sqft];
  for (const c of candidates) {
    if (typeof c === 'number' && !Number.isNaN(c) && c > 0) return Math.round(c * 100) / 100;
  }
  // Last resort: largest step area recorded inside the room.
  const stepMax = (room.finishingSteps ?? []).reduce(
    (max, s) => Math.max(max, s.stepSqft ?? s.targetSqft ?? 0),
    0,
  );
  return stepMax > 0 ? Math.round(stepMax * 100) / 100 : 0;
}

/**
 * Real area a finishing step covers in sqft. Falls back to the parent
 * room/side area (a coat covers the whole surface) instead of returning 0.
 */
export function getStepArea(step?: Partial<FinishingStep> | null, room?: Partial<Room> | null): number {
  if (step) {
    const candidates = [step.stepSqft, step.targetSqft, step.areaCompleted, step.completedSqft];
    for (const c of candidates) {
      if (typeof c === 'number' && !Number.isNaN(c) && c > 0) return Math.round(c * 100) / 100;
    }
  }
  return getRoomArea(room);
}

/** Total area of a whole process/room scope (sum of distinct step coverage). */
export function getRoomProcessArea(room?: Partial<Room> | null): number {
  if (!room) return 0;
  const steps = room.finishingSteps ?? [];
  if (steps.length === 0) return getRoomArea(room);
  return Math.round(steps.reduce((sum, s) => sum + getStepArea(s, room), 0) * 100) / 100;
}

/** Area actually completed on a step (falls back to its scoped target). */
export function getCompletedArea(step?: Partial<FinishingStep> | null, room?: Partial<Room> | null): number {
  if (!step) return 0;
  const candidates = [step.areaCompleted, step.completedSqft];
  for (const c of candidates) {
    if (typeof c === 'number' && !Number.isNaN(c) && c > 0) return Math.round(c * 100) / 100;
  }
  if (step.status === 'COMPLETED' || step.status === 'PENDING_INSPECTION') {
    return getStepArea(step, room);
  }
  return 0;
}

/* ---------------------------------------------------------------------------
 * Exterior work → floor/zone materialization
 *
 * Imported JSON keeps exterior walls in `exteriorWork.sides[].treatments[]`,
 * a shape none of the execution surfaces (Supervisor panel, Painter Portal,
 * daily targets, KPI audit) understand. We surface it as a real Floor named
 * "Exterior" so exterior tasks can be scheduled, assigned and inspected
 * exactly like interior floors — without touching interior sqft roll-ups.
 * ------------------------------------------------------------------------- */

export const EXTERIOR_FLOOR_ID = 'floor-exterior';
export const EXTERIOR_FLOOR_NAME = 'Exterior';

export function isExteriorFloor(floor?: Partial<Floor> | null): boolean {
  if (!floor) return false;
  return Boolean(floor.isExterior) || floor.id === EXTERIOR_FLOOR_ID;
}

export function exteriorRoomId(sideId: string): string {
  return `ext-room-${sideId}`;
}

export function exteriorStepId(treatmentId: string): string {
  return `ext-step-${treatmentId}`;
}

function exteriorSideLabel(side: ExteriorSide, index: number): string {
  const base = side.label || side.name || `Side ${index + 1}`;
  return /elevation|wall|facade|side/i.test(base) ? base : `${base} Elevation`;
}

function buildExteriorRoom(side: ExteriorSide, index: number): Room {
  const area = side.areaSqft ?? 0;
  const treatments = side.treatments ?? [];
  const baseSteps: FinishingStep[] = treatments.map((t, i) => ({
    id: exteriorStepId(t.id ?? `${side.id}-t${i}`),
    name: t.name || `Treatment ${i + 1}`,
    surface: exteriorSideLabel(side, index),
    surfaceType: 'EXTERIOR',
    status: t.status ?? 'NOT_STARTED',
    progressPct: t.status === 'COMPLETED' ? 100 : t.status === 'IN_PROGRESS' ? 50 : 0,
    brand: t.brand,
    productLine: t.productLine,
    stepNumber: i + 1,
    stepSqft: area > 0 ? area : undefined,
    targetSqft: area > 0 ? area : undefined,
    isExterior: true,
    sourceTreatmentId: t.id,
    enabled: true,
  }));

  const finishingSteps: FinishingStep[] =
    baseSteps.length > 0
      ? baseSteps
      : [
          {
            id: `ext-step-${side.id}-putty`,
            name: 'Putty Coat',
            surface: exteriorSideLabel(side, index),
            surfaceType: 'EXTERIOR',
            status: 'NOT_STARTED',
            stepNumber: 1,
            stepSqft: area > 0 ? area : undefined,
            targetSqft: area > 0 ? area : undefined,
            isExterior: true,
            enabled: true,
          },
          {
            id: `ext-step-${side.id}-primer`,
            name: 'Primer Coat',
            surface: exteriorSideLabel(side, index),
            surfaceType: 'EXTERIOR',
            status: 'NOT_STARTED',
            stepNumber: 2,
            stepSqft: area > 0 ? area : undefined,
            targetSqft: area > 0 ? area : undefined,
            isExterior: true,
            enabled: true,
          },
          {
            id: `ext-step-${side.id}-paint`,
            name: 'Paint/Finish',
            surface: exteriorSideLabel(side, index),
            surfaceType: 'EXTERIOR',
            status: 'NOT_STARTED',
            stepNumber: 3,
            stepSqft: area > 0 ? area : undefined,
            targetSqft: area > 0 ? area : undefined,
            isExterior: true,
            enabled: true,
          },
        ];

  return {
    id: exteriorRoomId(side.id ?? `side-${index}`),
    name: exteriorSideLabel(side, index),
    type: 'Exterior Wall',
    totalSqft: area > 0 ? area : undefined,
    netWallSqft: area > 0 ? area : undefined,
    sqft: area > 0 ? area : undefined,
    exteriorSqft: area > 0 ? area : undefined,
    condition: side.condition,
    isExterior: true,
    sourceSideId: side.id,
    finishingSteps,
  };
}

/** Build the synthetic Exterior floor from `project.exteriorWork`. */
export function buildExteriorFloor(project: Pick<PaintProject, 'exteriorWork' | 'floors'>): Floor | null {
  const sides = project.exteriorWork?.sides ?? [];
  if (sides.length === 0) return null;
  const level = (project.floors ?? []).reduce((max, f) => Math.max(max, f.level ?? 0), 0) + 1;
  return {
    id: EXTERIOR_FLOOR_ID,
    name: EXTERIOR_FLOOR_NAME,
    level,
    isExterior: true,
    rooms: sides.map((side, i) => buildExteriorRoom(side, i)),
  };
}

/**
 * Ensure a project exposes its exterior walls as a navigable floor/zone.
 * Idempotent: live execution state (status, photos, painters, targets) that a
 * supervisor already recorded on exterior steps is always preserved, while
 * newly imported sides/treatments are merged in.
 */
export function ensureExteriorFloor(project: PaintProject): PaintProject {
  const built = buildExteriorFloor(project);
  if (!built) return project;

  const floors = project.floors ?? [];
  const existingIdx = floors.findIndex((f) => isExteriorFloor(f));

  if (existingIdx === -1) {
    return { ...project, floors: [...floors, built] };
  }

  const existing = floors[existingIdx];
  const existingRooms = existing.rooms ?? [];

  const mergedRooms: Room[] = built.rooms.map((builtRoom) => {
    const prevRoom = existingRooms.find((r) => r.id === builtRoom.id);
    if (!prevRoom) return builtRoom;
    const prevSteps = prevRoom.finishingSteps ?? [];
    const mergedSteps = builtRoom.finishingSteps.map((builtStep) => {
      const prevStep = prevSteps.find((s) => s.id === builtStep.id);
      // Keep live execution data; refresh static scope metadata from the import.
      return prevStep
        ? {
            ...builtStep,
            ...prevStep,
            surface: builtStep.surface,
            stepSqft: prevStep.stepSqft ?? builtStep.stepSqft,
            targetSqft: prevStep.targetSqft ?? builtStep.targetSqft,
            isExterior: true,
          }
        : builtStep;
    });
    // Preserve any extra steps a supervisor added that are not in the import.
    const extraSteps = prevSteps.filter((s) => !builtRoom.finishingSteps.some((b) => b.id === s.id));
    return {
      ...builtRoom,
      exteriorSqft: prevRoom.exteriorSqft ?? builtRoom.exteriorSqft,
      finishingSteps: [...mergedSteps, ...extraSteps],
    };
  });

  const extraRooms = existingRooms.filter((r) => !built.rooms.some((b) => b.id === r.id));

  const nextFloors = [...floors];
  nextFloors[existingIdx] = {
    ...existing,
    name: existing.name || built.name,
    isExterior: true,
    rooms: [...mergedRooms, ...extraRooms],
  };
  return { ...project, floors: nextFloors };
}

/** Batch variant used when hydrating persisted/demo projects. */
export function ensureExteriorFloors(projects: PaintProject[]): PaintProject[] {
  return (projects ?? []).map((p) => {
    try {
      return ensureExteriorFloor(p);
    } catch (e) {
      console.warn('[Exterior] Failed to materialize exterior floor for project', p?.id, e);
      return p;
    }
  });
}

/** Live status of an exterior treatment, read back from the Exterior floor. */
export function exteriorTreatmentStatus(project: PaintProject, treatmentId: string): FinishingStep | undefined {
  const floor = (project.floors ?? []).find((f) => isExteriorFloor(f));
  if (!floor) return undefined;
  const stepId = exteriorStepId(treatmentId);
  for (const room of floor.rooms ?? []) {
    const step = (room.finishingSteps ?? []).find((s) => s.id === stepId || s.sourceTreatmentId === treatmentId);
    if (step) return step;
  }
  return undefined;
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
  return 'NOT_STARTED';
}

export function statusToProgress(status: TaskStatus): number {
  if (status === 'COMPLETED') return 100;
  if (status === 'PENDING_INSPECTION') return 90;
  if (status === 'IN_PROGRESS') return 50;
  if (status === 'PAUSED') return 40;
  if (status === 'ASSIGNED') return 10;
  return 0;
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const STOCK_PHOTO_HOSTS = [
  'images.unsplash.com',
  'unsplash.com',
  'pravatar.cc',
  'picsum.photos',
  'pexels.com',
  'via.placeholder.com',
  'placehold.co',
  'loremflickr.com',
  'dummyimage.com',
];

/** True for known stock/demo photo hosts. Real uploaded images (data:image, supabase, user CDN) are NOT stock. */
export function isStockPhotoUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith('data:image')) return false;
  try {
    const u = new URL(url);
    return STOCK_PHOTO_HOSTS.some((h) => u.hostname.includes(h));
  } catch {
    return STOCK_PHOTO_HOSTS.some((h) => url.includes(h));
  }
}

/**
 * Resolve the REAL uploaded photo for a step. Hardcoded stock/demo URLs are
 * treated as missing so the UI falls back to a "No Photo Uploaded" placeholder.
 */
export function getRealPhotoUrl(step: { beforePhoto?: string; beforePhotoUrl?: string; afterPhoto?: string; afterPhotoUrl?: string; completionPhoto?: string } | undefined, type: 'before' | 'after'): string | undefined {
  if (!step) return undefined;
  const raw =
    type === 'before'
      ? step.beforePhoto || step.beforePhotoUrl
      : step.afterPhoto || step.completionPhoto || step.afterPhotoUrl;
  if (!raw || isStockPhotoUrl(raw)) return undefined;
  return raw;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "29 Aug" */
export function formatSchedDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "28 Aug, 04:15 PM" */
export function formatDateTime(ts?: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${time}`;
}

export interface SlaInfo {
  hasTarget: boolean;
  targetDays: number;
  actualDays: number;
  delayDays: number;
  delayed: boolean;
  completed: boolean;
}

/**
 * Compute SLA vs actual duration for a step.
 * Target = estimatedDurationDays. Actual = days between start (beforePhotoAt/startedAt/scheduledDate)
 * and completion (completedAt/afterPhotoAt). A positive gap means the painter breached the estimate.
 */
export function computeSla(step: {
  scheduledDate?: string;
  estimatedDurationDays?: number;
  startedAt?: number;
  beforePhotoAt?: number;
  afterPhotoAt?: number;
  completedAt?: number;
}): SlaInfo | null {
  const completedAt = step.completedAt ?? step.afterPhotoAt;
  if (!completedAt) return null;
  const target = step.estimatedDurationDays ?? 1;
  const startRef =
    step.startedAt ??
    step.beforePhotoAt ??
    (step.scheduledDate ? new Date(`${step.scheduledDate}T00:00:00`).getTime() : completedAt);
  const diffDays = (completedAt - startRef) / 86400000;
  const actualDays = Math.max(1, Math.round(diffDays));
  const delayDays = actualDays - target;
  return {
    hasTarget: Boolean(step.estimatedDurationDays),
    targetDays: target,
    actualDays,
    delayDays,
    delayed: delayDays > 0,
    completed: true,
  };
}

/** Relative day label for a date header, e.g. "Today", "Yesterday", or the absolute date. */
export function relativeDayLabel(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${iso}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1) return `${diff} Days Ago`;
  if (diff === -1) return 'Tomorrow';
  return `In ${Math.abs(diff)} Days`;
}

/** Full header for grouped logs, e.g. "29 Aug 2026 - Today". */
export function logDateHeader(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const full = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  return `${full} - ${relativeDayLabel(iso)}`;
}

/* ---------------------------------------------------------------------------
 * Material classification helpers
 * ------------------------------------------------------------------------- */

/**
 * True when the material is explicitly an exterior coating
 * (Exterior Primer, Exterior Putty, Exterior Emulsion, Weathercoat).
 * Interior materials like Economy Emulsion, Interior Primer, Wall Putty
 * MUST return false here.
 */
export function isExteriorMaterial(m: { name?: string; category?: string }): boolean {
  const name = (m.name ?? '').toLowerCase();
  const cat = (m.category ?? '').toLowerCase();
  return (
    name.includes('exterior') ||
    cat.includes('exterior') ||
    /weathercoat/i.test(name)
  );
}

/**
 * True when the material is an interior coating or supply.
 * Returns false for exterior materials so they are never mixed.
 */
export function isInteriorMaterial(m: { name?: string; category?: string }): boolean {
  if (isExteriorMaterial(m)) return false;
  const name = (m.name ?? '').toLowerCase();
  const cat = (m.category ?? '').toLowerCase();
  return (
    name.includes('interior') ||
    cat.includes('interior') ||
    name.includes('wall putty') ||
    /tractor\s*acrylic\s*primer|royal\s*aspira|economy\s*emulsion|asian\s*paints\s*emulsion/i.test(name) ||
    /primer|emulsion|putty|paint/i.test(name)
  );
}

/** Filter a material list to only exterior coatings. */
export function filterExteriorMaterials<T extends { name?: string; category?: string }>(materials: T[]): T[] {
  return materials.filter(isExteriorMaterial);
}

/** Filter a material list to only interior coatings and supplies. */
export function filterInteriorMaterials<T extends { name?: string; category?: string }>(materials: T[]): T[] {
  return materials.filter(isInteriorMaterial);
}
