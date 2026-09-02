export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type SurfaceType = 'WALL' | 'CEILING' | 'DOOR' | 'WINDOW' | 'METAL' | 'WOOD' | 'EXTERIOR' | 'OTHER';
export type IndentUrgency = 'Normal' | 'Urgent';
export type IndentStatus = 'PENDING_APPROVAL' | 'APPROVED_DISPATCHED' | 'REJECTED';
export type OrderStatus = 'PENDING_STORE_ORDER' | 'ORDERED' | 'DELIVERED_AT_SITE';
export type ProjectWorkflowStatus = 'SURVEY_COMPLETE' | 'BOM_GENERATED' | 'PROCUREMENT_IN_PROGRESS' | 'LIVE_EXECUTION' | 'COMPLETED';
export type PhotoAuditStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface FinishingStep {
  id: string;
  name: string;
  surface: string;
  surfaceType?: SurfaceType;
  coatNumber?: number;
  status: TaskStatus;
  progressPct?: number;
  painterIds?: string[];
  qaVerified?: boolean;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  beforePhotoAt?: number;
  afterPhotoAt?: number;
  photoGpsVerified?: boolean;
  photoAuditStatus?: PhotoAuditStatus;
  brand?: string;
  productLine?: string;
  stepSqft?: number;
  stepNumber?: number;
}

export interface Room {
  id: string;
  name: string;
  type?: string;
  interiorSqft?: number;
  exteriorSqft?: number;
  doorsCount?: number;
  windowsCount?: number;
  finishingSteps: FinishingStep[];
}

export interface Floor {
  id: string;
  name: string;
  level?: number;
  rooms: Room[];
}

export interface MaterialItem {
  id: string;
  name: string;
  category?: string;
  brand?: string;
  totalRequiredQty?: number;
  unit?: string;
  packSize?: string;
  vendorName?: string;
  vendorId?: string;
  unitCost?: number;
  orderedQty?: number;
  deliveredQty?: number;
  orderStatus?: OrderStatus;
}

export interface Vendor {
  id: string;
  storeName: string;
  ownerName?: string;
  phone?: string;
  address?: string;
  brands?: string[];
  creditDays?: number;
  gstin?: string;
  contactPerson?: string;
  distanceKm?: number;
  minDeliveryHours?: number;
  whatsappNumber?: string;
}

export interface VendorOrder {
  id: string;
  materialId: string;
  materialName: string;
  vendorName: string;
  orderQty: number;
  unit?: string;
  status: OrderStatus;
  orderedAt: string;
  deliveredAt?: string;
  notes?: string;
}

export interface CustomerDetails {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface ProjectDetails {
  name?: string;
  status?: string;
  workflowStatus?: ProjectWorkflowStatus;
  totalSqft?: number;
  estimatedDays?: number;
  actualDays?: number;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  totalMaterialCost?: number;
  totalLaborCost?: number;
  estimatedProfitMargin?: number;
  dailyPainterRate?: number;
}

export interface SummaryMetrics {
  totalInteriorSqft?: number;
  totalExteriorSqft?: number;
  totalDoorsWindowsQty?: number;
  estimatedTotalDays?: number;
}

export interface ExteriorWork {
  totalAreaSqft?: number;
}

export interface Supervisor {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
}

export type ClockState = 'CLOCKED_OUT' | 'CLOCKED_IN' | 'ON_BREAK';

export interface Painter {
  id: string;
  name: string;
  phone?: string;
  checkedIn?: boolean;
  clockState?: ClockState;
  clockInAt?: number;
  clockOutAt?: number;
  breakStartAt?: number;
  totalBreakMs?: number;
  gpsVerified?: boolean;
  siteLabel?: string;
}

export interface DailyTarget {
  id: string;
  painterId: string;
  floorId: string;
  roomId: string;
  stepId: string;
  targetSqft: number;
  date: string;
  achievedSqft?: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface MaterialConsumptionEntry {
  materialId: string;
  materialName: string;
  quantityUsed: number;
  unit?: string;
}

export interface DailyLog {
  id: string;
  supervisorId: string;
  supervisorName: string;
  date: string;
  attendanceCount: number;
  notes?: string;
  issues?: string;
  consumption: MaterialConsumptionEntry[];
  submittedAt: string;
}

export interface QaChecklist {
  surfaceSanded: boolean;
  uniformCoverage: boolean;
  noRollerMarks: boolean;
  edgesTrimClean: boolean;
}

export interface QaRecord {
  id: string;
  stepId: string;
  floorId: string;
  roomId: string;
  checklist: QaChecklist;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  approvedBy: string;
  approvedAt: string;
}

export interface PaintProject {
  id: string;
  projectDetails: ProjectDetails;
  customerDetails: CustomerDetails;
  summaryMetrics?: SummaryMetrics;
  exteriorWork?: ExteriorWork;
  floors: Floor[];
  materialBillOfQuantities: MaterialItem[];
  leadSupervisorId?: string;
  supervisors?: Supervisor[];
  painters?: Painter[];
  vendors?: Vendor[];
  vendorOrders?: VendorOrder[];
  dailyLogs?: DailyLog[];
  qaRecords?: QaRecord[];
  dailyTargets?: DailyTarget[];
}
