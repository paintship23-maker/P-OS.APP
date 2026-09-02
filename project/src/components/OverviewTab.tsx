import { useState } from 'react';
import {
  Ruler,
  Layers,
  DoorOpen,
  Package,
  TrendingUp,
  Clock,
  Wallet,
  Shield,
  MapPin,
  User,
  ChevronDown,
  CalendarDays,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  ClipboardList,
  Zap,
  CheckCircle2,
  ShoppingBag,
  Hammer,
} from 'lucide-react';
import type { PaintProject, ProjectWorkflowStatus, MaterialItem } from '@/types';
import { computeMetrics, fmtNum, fmtINR, fmtPct } from '@/utils';

interface OverviewTabProps {
  project: PaintProject;
  onRaisePurchaseOrder?: () => void;
}

const WORKFLOW_CONFIG: Record<ProjectWorkflowStatus, { label: string; color: string; bg: string; dot: string }> = {
  SURVEY_COMPLETE: { label: 'Survey Complete', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800', dot: 'bg-slate-400' },
  BOM_GENERATED: { label: 'BOM Generated', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/15', dot: 'bg-blue-500' },
  PROCUREMENT_IN_PROGRESS: { label: 'Procurement In Progress', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/15', dot: 'bg-amber-500' },
  LIVE_EXECUTION: { label: 'Live Execution', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/15', dot: 'bg-emerald-500' },
  COMPLETED: { label: 'Completed', color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-100 dark:bg-brand-500/15', dot: 'bg-brand-500' },
};

const WORKFLOW_STEPS: ProjectWorkflowStatus[] = ['SURVEY_COMPLETE', 'BOM_GENERATED', 'PROCUREMENT_IN_PROGRESS', 'LIVE_EXECUTION', 'COMPLETED'];

function deriveWorkflowStatus(project: PaintProject): ProjectWorkflowStatus {
  if (project.projectDetails.workflowStatus) return project.projectDetails.workflowStatus;
  const materials = project.materialBillOfQuantities ?? [];
  const hasOrders = materials.some((m) => m.orderStatus === 'ORDERED' || m.orderStatus === 'DELIVERED_AT_SITE');
  const allDelivered = materials.length > 0 && materials.every((m) => m.orderStatus === 'DELIVERED_AT_SITE');
  const metrics = computeMetrics(project);
  if (metrics.completedTasks > 0 && metrics.completedTasks === metrics.totalTasks) return 'COMPLETED';
  if (metrics.completedTasks > 0 || metrics.inProgressTasks > 0) return 'LIVE_EXECUTION';
  if (allDelivered) return 'LIVE_EXECUTION';
  if (hasOrders) return 'PROCUREMENT_IN_PROGRESS';
  if (materials.length > 0) return 'BOM_GENERATED';
  return 'SURVEY_COMPLETE';
}

interface AutoBomItem {
  name: string;
  category: string;
  coveragePerUnit: number;
  unit: string;
  unitCost: number;
}

const AUTO_BOM_SPEC: AutoBomItem[] = [
  { name: 'Wall Putty', category: 'Surface Prep', coveragePerUnit: 40, unit: 'kg', unitCost: 35 },
  { name: 'Primer (Interior)', category: 'Primer', coveragePerUnit: 100, unit: 'L', unitCost: 180 },
  { name: 'Emulsion Topcoat', category: 'Finish Coat', coveragePerUnit: 140, unit: 'L', unitCost: 320 },
  { name: 'Enamel (Doors/Windows)', category: 'Enamel', coveragePerUnit: 80, unit: 'L', unitCost: 280 },
  { name: 'Masking Tape', category: 'Consumables', coveragePerUnit: 500, unit: 'rolls', unitCost: 45 },
];

function computeAutoBom(totalSqft: number, doorsWindows: number): { item: AutoBomItem; qty: number; cost: number }[] {
  if (totalSqft <= 0) return [];
  return AUTO_BOM_SPEC.map((item) => {
    let area = totalSqft;
    if (item.name === 'Enamel (Doors/Windows)') area = doorsWindows * 30;
    if (item.name === 'Masking Tape') area = totalSqft;
    const qty = Math.ceil(area / item.coveragePerUnit);
    return { item, qty, cost: qty * item.unitCost };
  });
}

export function OverviewTab({ project, onRaisePurchaseOrder }: OverviewTabProps) {
  const metrics = computeMetrics(project);
  const pd = project.projectDetails;
  const cd = project.customerDetails;
  const leadSup = project.supervisors?.find((s) => s.id === project.leadSupervisorId);
  const workflowStatus = deriveWorkflowStatus(project);
  const wfConfig = WORKFLOW_CONFIG[workflowStatus];
  const isEarlyStage = workflowStatus === 'SURVEY_COMPLETE' || workflowStatus === 'BOM_GENERATED';
  const hasPurchaseOrders = (project.materialBillOfQuantities ?? []).some(
    (m) => m.orderStatus === 'ORDERED' || m.orderStatus === 'DELIVERED_AT_SITE',
  );

  const totalSqft = pd.totalSqft ?? metrics.interiorSqft;
  const autoBom = computeAutoBom(totalSqft, metrics.doorsWindowsQty);
  const autoBomTotal = autoBom.reduce((sum, b) => sum + b.cost, 0);

  const workflowIdx = WORKFLOW_STEPS.indexOf(workflowStatus);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Project overview card with workflow badge */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {/* Left: project identity */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-brand-500">Project Overview</p>
                <h2 className="mt-0.5 text-xl font-bold text-slate-800 dark:text-slate-100">
                  {pd.name ?? 'Untitled Project'}
                </h2>
              </div>
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${wfConfig.bg} ${wfConfig.color}`}>
                <span className={`h-2 w-2 rounded-full ${wfConfig.dot} ${workflowStatus === 'LIVE_EXECUTION' ? 'animate-pulse' : ''}`} />
                {wfConfig.label}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <InfoRow icon={<User size={14} />} label="Client" value={cd.name ?? '—'} />
              <InfoRow icon={<MapPin size={14} />} label="Address" value={cd.address ?? '—'} />
              <InfoRow icon={<Ruler size={14} />} label="Total SqFt" value={`${fmtNum(pd.totalSqft)} sqft`} />
              <InfoRow icon={<Wallet size={14} />} label="Total Budget" value={fmtINR(pd.totalBudget)} />
              <InfoRow
                icon={<Shield size={14} />}
                label="Lead Supervisor"
                value={leadSup ? `${leadSup.name} (${leadSup.role})` : 'Not assigned'}
              />
            </div>
          </div>

          {/* Right: timeline + completion */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TimelineCard
                icon={<CalendarDays size={16} />}
                label="Start Date"
                value={pd.startDate ?? '—'}
              />
              <TimelineCard
                icon={<CalendarDays size={16} />}
                label="End Date"
                value={pd.endDate ?? '—'}
              />
              <TimelineCard
                icon={<Clock size={16} />}
                label="Estimated Days"
                value={`${pd.estimatedDays ?? '—'} days`}
              />
              <TimelineCard
                icon={<Clock size={16} />}
                label="Actual Days"
                value={`${pd.actualDays ?? '—'} days`}
                highlight={(pd.actualDays ?? 0) > (pd.estimatedDays ?? 0)}
              />
            </div>

            {/* Completion progress */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <TrendingUp size={15} className="text-brand-500" />
                  Overall Completion
                </span>
                <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                  {metrics.overallPct}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                  style={{ width: `${metrics.overallPct}%` }}
                />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                <Legend color="bg-emerald-500" label={`Completed: ${metrics.completedTasks}`} />
                <Legend color="bg-amber-500" label={`In Progress: ${metrics.inProgressTasks}`} />
                <Legend color="bg-slate-400" label={`Pending: ${metrics.pendingTasks}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Workflow progress bar */}
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            {WORKFLOW_STEPS.map((step, idx) => {
              const cfg = WORKFLOW_CONFIG[step];
              const isDone = idx <= workflowIdx;
              const isCurrent = idx === workflowIdx;
              return (
                <div key={step} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold transition-all ${
                      isDone ? `${cfg.bg} ${cfg.color}` : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    } ${isCurrent ? 'ring-2 ring-brand-400 ring-offset-1 dark:ring-offset-slate-900' : ''}`}>
                      {isDone ? <CheckCircle2 size={13} /> : idx + 1}
                    </div>
                    <p className={`text-[9px] font-medium leading-tight text-center ${isDone ? cfg.color : 'text-slate-400'}`}>
                      {cfg.label.split(' ')[0]}
                    </p>
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div className={`mx-1 h-0.5 flex-1 rounded-full ${idx < workflowIdx ? 'bg-brand-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={<Ruler size={18} />} value={`${fmtNum(metrics.interiorSqft)}`} label="Interior SqFt" color="brand" />
        <MetricCard icon={<Layers size={18} />} value={`${fmtNum(metrics.exteriorSqft)}`} label="Exterior SqFt" color="sky" />
        <MetricCard icon={<DoorOpen size={18} />} value={`${metrics.doorsWindowsQty}`} label="Doors & Windows" color="amber" />
        <MetricCard icon={<Package size={18} />} value={`${metrics.materialCount}`} label="Materials" color="emerald" />
      </div>

      {/* Pre-Execution Audit & Planning Panel (early stages) */}
      {isEarlyStage && (
        <PreExecutionPanel
          autoBom={autoBom}
          autoBomTotal={autoBomTotal}
          totalSqft={totalSqft}
          hasExistingBom={(project.materialBillOfQuantities ?? []).length > 0}
          onRaisePurchaseOrder={onRaisePurchaseOrder}
        />
      )}

      {/* P&L Card — only when purchase orders exist or execution started */}
      {hasPurchaseOrders && <PnLCard project={project} />}

      {/* Floor-by-floor breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Floor Breakdown</h3>
        {(project.floors ?? []).map((floor) => (
          <FloorAccordion key={floor.id} floor={floor} />
        ))}
      </div>
    </div>
  );
}

function PreExecutionPanel({
  autoBom,
  autoBomTotal,
  totalSqft,
  hasExistingBom,
  onRaisePurchaseOrder,
}: {
  autoBom: { item: AutoBomItem; qty: number; cost: number }[];
  autoBomTotal: number;
  totalSqft: number;
  hasExistingBom: boolean;
  onRaisePurchaseOrder?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-card dark:border-blue-500/30 dark:from-blue-500/10 dark:to-slate-900">
      <div className="flex items-center gap-2.5 border-b border-blue-100 px-5 py-3.5 dark:border-blue-500/20">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <ClipboardList size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pre-Execution Audit & Planning</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Auto-calculated material requirements based on {fmtNum(totalSqft)} sqft</p>
        </div>
      </div>
      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {autoBom.map(({ item, qty, cost }) => (
            <div key={item.name} className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{qty} {item.unit}</p>
                  <p className="text-xs text-slate-500">{fmtINR(cost)}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                <Ruler size={10} />
                Coverage: {item.coveragePerUnit} sqft/{item.unit}
              </div>
            </div>
          ))}
        </div>

        {/* Total + action */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-xs text-slate-500 dark:text-slate-400">Estimated Material Cost</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmtINR(autoBomTotal)}</p>
          </div>
          <button
            onClick={onRaisePurchaseOrder}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-600 active:scale-[0.98]"
          >
            <ShoppingBag size={18} />
            Raise Purchase Order
          </button>
        </div>
        {hasExistingBom && (
          <p className="mt-2 text-center text-xs text-slate-400">
            BOM already generated — use the BOM tab to manage existing materials and vendor orders.
          </p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-slate-400">{icon}</span>
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
      <span className="ml-auto text-right text-sm font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}

function TimelineCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-500/10'
          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
      }`}
    >
      <div className={`mb-1 ${highlight ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{icon}</div>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function MetricCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: 'brand' | 'sky' | 'amber' | 'emerald';
}) {
  const colors = {
    brand: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10',
    sky: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-2 grid h-9 w-9 place-items-center rounded-lg ${colors[color]}`}>{icon}</div>
      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function PnLCard({ project }: { project: PaintProject }) {
  const pd = project.projectDetails;
  const revenue = pd.totalBudget ?? 0;
  const materialSpend =
    pd.totalMaterialCost ??
    (project.materialBillOfQuantities ?? []).reduce(
      (sum, m) => sum + (m.orderedQty ?? 0) * (m.unitCost ?? 0),
      0,
    );
  const laborSpend =
    pd.totalLaborCost ??
    (project.dailyLogs ?? []).reduce(
      (sum, log) => sum + log.attendanceCount * (pd.dailyPainterRate ?? 0),
      0,
    );
  const totalCost = materialSpend + laborSpend;
  const netProfit = revenue - totalCost;
  const profitPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const isProfit = netProfit >= 0;
  const margin = pd.estimatedProfitMargin ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <DollarSign size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Project P&L & Cashflow</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Real-time financial overview</p>
        </div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <PnLRow
          icon={<Banknote size={16} />}
          label="Budgeted Revenue"
          value={fmtINR(revenue)}
          color="text-slate-700 dark:text-slate-200"
          bg="bg-slate-100 dark:bg-slate-800"
        />
        <PnLRow
          icon={<ArrowUpRight size={16} />}
          label="Material Spend"
          value={fmtINR(materialSpend)}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-500/10"
        />
        <PnLRow
          icon={<ArrowUpRight size={16} />}
          label="Labor Spend (Est.)"
          value={fmtINR(laborSpend)}
          color="text-orange-600 dark:text-orange-400"
          bg="bg-orange-50 dark:bg-orange-500/10"
        />
        <PnLRow
          icon={isProfit ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
          label="Net Profit"
          value={fmtINR(netProfit)}
          subValue={`${profitPct.toFixed(1)}% margin`}
          color={isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
          bg={isProfit ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}
        />
      </div>
      {/* Profit bar */}
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Est. Profit Margin: <span className="font-semibold text-slate-700 dark:text-slate-200">{margin}%</span>
          </span>
          <span className={`font-semibold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {isProfit ? 'On Track' : 'Over Budget'}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isProfit ? 'bg-emerald-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(Math.abs(profitPct), 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PnLRow({
  icon,
  label,
  value,
  subValue,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3.5 dark:border-slate-800">
      <div className={`mb-2 grid h-8 w-8 place-items-center rounded-lg ${bg} ${color}`}>{icon}</div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      {subValue && <p className={`mt-0.5 text-xs font-medium ${color}`}>{subValue}</p>}
    </div>
  );
}

function FloorAccordion({ floor }: { floor: NonNullable<PaintProject['floors'][number]> }) {
  const [open, setOpen] = useState(true);
  const rooms = floor.rooms ?? [];
  const totalSqft = rooms.reduce((sum, r) => sum + (r.interiorSqft ?? 0), 0);
  const totalSteps = rooms.reduce((sum, r) => sum + (r.finishingSteps?.length ?? 0), 0);
  const completedSteps = rooms.reduce(
    (sum, r) => sum + (r.finishingSteps?.filter((s) => s.status === 'COMPLETED').length ?? 0),
    0,
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-2.5">
          <Layers size={15} className="text-brand-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{floor.name}</span>
          <span className="text-xs text-slate-400">
            {rooms.length} rooms · {fmtNum(totalSqft)} sqft
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {fmtPct(completedSteps, totalSteps)}
          </span>
          <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800">
          {rooms.map((room) => {
            const steps = room.finishingSteps ?? [];
            const done = steps.filter((s) => s.status === 'COMPLETED').length;
            return (
              <div key={room.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{room.name}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{fmtNum(room.interiorSqft)} sqft</span>
                  <span>·</span>
                  <span>{done}/{steps.length} steps</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${steps.length > 0 ? (done / steps.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
