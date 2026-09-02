import type {
  PaintProject,
  Floor,
  Room,
  FinishingStep,
  MaterialItem,
  Supervisor,
  TaskStatus,
} from './types';

const VALID_STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

function uid(prefix: string, i: number): string {
  return `${prefix}-${i}-${Math.random().toString(36).slice(2, 8)}`;
}

function asNum(v: unknown): number | undefined {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

function asStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim() !== '') return v;
  return undefined;
}

function coerceStatus(v: unknown): TaskStatus {
  if (typeof v === 'string') {
    const up = v.toUpperCase().replace(/[\s-]/g, '_');
    if (VALID_STATUSES.includes(up as TaskStatus)) return up as TaskStatus;
    if (up === 'DONE' || up === 'COMPLETE') return 'COMPLETED';
    if (up === 'STARTED' || up === 'ONGOING') return 'IN_PROGRESS';
  }
  return 'PENDING';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseFinishingSteps(raw: unknown, roomPrefix: string): FinishingStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s, i) => {
    const obj = (s ?? {}) as Record<string, unknown>;
    const product = asStr(obj.product);
    const service = asStr(obj.service) ?? asStr(obj.name) ?? asStr(obj.step);
    const isNone = (v?: string) => !v || v.toLowerCase() === 'none';
    const name =
      (!isNone(product) ? product : undefined) ??
      (!isNone(service) ? capitalize(service!) : undefined) ??
      'Unnamed Step';
    return {
      id: asStr(obj.id) || uid(roomPrefix, i),
      name,
      surface: asStr(obj.surface) || asStr(obj.surfaceName) || '—',
      surfaceType: asStr(obj.surfaceType) as FinishingStep['surfaceType'] | undefined,
      coatNumber: asNum(obj.coatNumber) ?? asNum(obj.coats) ?? asNum(obj.coat),
      status: coerceStatus(obj.status),
      brand: asStr(obj.brand),
      productLine: asStr(obj.productLine),
      stepSqft: asNum(obj.stepSqft) ?? asNum(obj.sqft),
      stepNumber: asNum(obj.stepNumber) ?? asNum(obj.stepNo),
    } satisfies FinishingStep;
  });
}

function parseRooms(raw: unknown, floorPrefix: string): Room[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r, i) => {
    const obj = (r ?? {}) as Record<string, unknown>;
    const stepsRaw = obj.finishingSteps ?? obj.steps ?? obj.tasks ?? [];
    return {
      id: asStr(obj.id) || uid(floorPrefix, i),
      name: asStr(obj.name) || asStr(obj.roomName) || `Room ${i + 1}`,
      type: asStr(obj.type) ?? asStr(obj.roomType),
      interiorSqft: asNum(obj.interiorSqft) ?? asNum(obj.interiorArea) ?? asNum(obj.area),
      exteriorSqft: asNum(obj.exteriorSqft) ?? asNum(obj.exteriorArea),
      doorsCount: asNum(obj.doorsCount) ?? asNum(obj.doors),
      windowsCount: asNum(obj.windowsCount) ?? asNum(obj.windows),
      finishingSteps: parseFinishingSteps(stepsRaw, `${floorPrefix}-r${i}`),
    } satisfies Room;
  });
}

function parseFloors(raw: unknown): Floor[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f, i) => {
    const obj = (f ?? {}) as Record<string, unknown>;
    const roomsRaw = obj.rooms ?? obj.roomList ?? [];
    return {
      id: asStr(obj.id) || uid('floor', i),
      name: asStr(obj.floorName) ?? asStr(obj.name) ?? `Floor ${i + 1}`,
      level: asNum(obj.level) ?? i,
      rooms: parseRooms(roomsRaw, `f${i}`),
    } satisfies Floor;
  });
}

function parseMaterials(raw: unknown): MaterialItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m, i) => {
    const obj = (m ?? {}) as Record<string, unknown>;
    return {
      id: asStr(obj.id) || uid('mat', i),
      name: asStr(obj.productName) ?? asStr(obj.name) ?? asStr(obj.materialName) ?? 'Unnamed Material',
      category: asStr(obj.category) ?? asStr(obj.materialCategory),
      brand: asStr(obj.brand) ?? asStr(obj.manufacturer),
      totalRequiredQty: asNum(obj.totalQuantity) ?? asNum(obj.estimatedQty) ?? asNum(obj.totalRequiredQty) ?? asNum(obj.quantity),
      unit: asStr(obj.unit) ?? asStr(obj.uom),
      packSize: asStr(obj.packSize) ?? asStr(obj.packaging),
      vendorName: asStr(obj.vendorName) ?? asStr(obj.vendor),
      orderedQty: asNum(obj.orderedQty) ?? asNum(obj.ordered),
      deliveredQty: asNum(obj.deliveredQty) ?? asNum(obj.delivered),
      orderStatus: asStr(obj.orderStatus) as MaterialItem['orderStatus'] | undefined,
    } satisfies MaterialItem;
  });
}

function parseSupervisors(raw: unknown): Supervisor[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s, i) => {
    const obj = (s ?? {}) as Record<string, unknown>;
    return {
      id: asStr(obj.id) || uid('sup', i),
      name: asStr(obj.name) || asStr(obj.supervisorName) || `Supervisor ${i + 1}`,
      role: asStr(obj.role) ?? asStr(obj.designation),
      phone: asStr(obj.phone) ?? asStr(obj.mobile),
      email: asStr(obj.email),
    } satisfies Supervisor;
  });
}

export function parseProjectJson(raw: unknown): PaintProject {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const pd = (obj.projectInfo ?? obj.projectDetails ?? obj.project ?? {}) as Record<string, unknown>;
  const cd = (obj.customer ?? obj.customerDetails ?? {}) as Record<string, unknown>;
  const sm = (obj.summaryMetrics ?? {}) as Record<string, unknown>;
  const ew = (obj.exteriorWork ?? {}) as Record<string, unknown>;

  return {
    id: asStr(obj.id) || asStr(pd.id) || uid('proj', 0),
    projectDetails: {
      name: asStr(pd.projectName) ?? asStr(pd.name) ?? 'Untitled Project',
      status: asStr(pd.status) ?? 'Draft',
      totalSqft: asNum(sm.totalInteriorSqft) ?? asNum(pd.totalSqft) ?? asNum(pd.totalArea),
      estimatedDays: asNum(sm.estimatedTotalDays) ?? asNum(pd.estimatedDays) ?? asNum(pd.duration),
      actualDays: asNum(pd.actualDays) ?? asNum(pd.actualDuration),
      startDate: asStr(pd.startDate),
      endDate: asStr(pd.endDate),
      totalBudget: asNum(pd.totalBudget) ?? asNum(pd.budget),
    },
    customerDetails: {
      name: asStr(cd.name) ?? asStr(cd.customerName),
      phone: asStr(cd.phone),
      email: asStr(cd.email),
      address: asStr(cd.address) ?? asStr(cd.location),
    },
    summaryMetrics: {
      totalInteriorSqft: asNum(sm.totalInteriorSqft),
      totalExteriorSqft: asNum(sm.totalExteriorSqft) ?? asNum(ew.totalAreaSqft),
      totalDoorsWindowsQty: asNum(sm.totalDoorsWindowsQty),
      estimatedTotalDays: asNum(sm.estimatedTotalDays),
    },
    exteriorWork: {
      totalAreaSqft: asNum(ew.totalAreaSqft),
    },
    floors: parseFloors(obj.floors ?? obj.floorList),
    materialBillOfQuantities: parseMaterials(
      obj.materialBillOfQuantities ?? obj.materials ?? obj.bom,
    ),
    supervisors: parseSupervisors(obj.supervisors ?? obj.supervisorList),
    leadSupervisorId: asStr(obj.leadSupervisorId) ?? asStr(pd.leadSupervisorId),
    vendorOrders: [],
    dailyLogs: [],
    qaRecords: [],
    dailyTargets: [],
  };
}
