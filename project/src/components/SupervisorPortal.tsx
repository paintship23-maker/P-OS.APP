import { useMemo, useState, useEffect } from 'react';
import {
  Sun,
  CheckCircle2,
  Clock,
  ClipboardList,
  Layers,
  Brush,
  UserCircle2,
  TrendingUp,
  Calendar,
  Users,
  AlertTriangle,
  FileText,
  ClipboardCheck,
  ChevronDown,
  Check,
  Target,
  Plus,
  Ruler,
  LogIn,
  LogOut,
  MapPin,
  Timer,
  Coffee,
  X,
} from 'lucide-react';
import type {
  PaintProject,
  Supervisor,
  FinishingStep,
  TaskStatus,
  DailyLog,
  Painter,
  ClockState,
} from '@/types';
import { StatusBadge } from './StatusBadge';
import { DailyLogModal, type DailyLogForm } from './DailyLogModal';
import { QaInspectionModal, type QaForm } from './QaInspectionModal';
import { progressToStatus, statusToProgress, todayISO } from '@/utils';

interface SupervisorPortalProps {
  project: PaintProject;
  supervisor: Supervisor;
  onTaskProgress: (floorId: string, roomId: string, stepId: string, progressPct: number, status: TaskStatus) => void;
  onPainterAssign: (floorId: string, roomId: string, stepId: string, painterIds: string[]) => void;
  onQaApprove: (floorId: string, roomId: string, stepId: string, form: QaForm) => void;
  onAssignDailyTarget: (painterId: string, floorId: string, roomId: string, stepId: string, targetSqft: number) => void;
  onTogglePainterCheckIn: (painterId: string) => void;
  onClockChange: (painterId: string, state: ClockState) => void;
  onPhotoAudit: (floorId: string, roomId: string, stepId: string, approved: boolean) => void;
  onSubmitDailyLog: (log: Omit<DailyLog, 'id' | 'supervisorId' | 'supervisorName' | 'submittedAt'>) => void;
}

const STEP_ICONS: Record<string, string> = {
  putty: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  primer: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  emulsion: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400',
  sanding: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  cleaning: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',
  touchup: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  qa: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
};

function stepIconClass(name: string): string {
  const key = name.toLowerCase();
  for (const k of Object.keys(STEP_ICONS)) {
    if (key.includes(k)) return STEP_ICONS[k];
  }
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
}

export function SupervisorPortal({
  project,
  supervisor,
  onTaskProgress,
  onPainterAssign,
  onQaApprove,
  onAssignDailyTarget,
  onTogglePainterCheckIn,
  onClockChange,
  onPhotoAudit,
  onSubmitDailyLog,
}: SupervisorPortalProps) {
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showTargetAllocator, setShowTargetAllocator] = useState(false);
  const [qaTarget, setQaTarget] = useState<{ floorId: string; roomId: string; step: FinishingStep; roomName: string } | null>(null);
  const [openFloors, setOpenFloors] = useState<Set<string>>(
    () => new Set(project.floors?.map((f) => f.id) ?? []),
  );
  const [, setTick] = useState(0);

  const toggleFloor = (id: string) =>
    setOpenFloors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // All tasks for this project (supervisor sees all tasks for their project)
  const allTasks = useMemo(() => {
    const result: { floorId: string; floorName: string; roomId: string; roomName: string; step: FinishingStep }[] = [];
    for (const floor of project.floors ?? []) {
      for (const room of floor.rooms ?? []) {
        for (const step of room.finishingSteps ?? []) {
          result.push({ floorId: floor.id, floorName: floor.name, roomId: room.id, roomName: room.name, step });
        }
      }
    }
    return result;
  }, [project]);

  const totalAssigned = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.step.status === 'COMPLETED').length;
  const inProgressTasks = allTasks.filter((t) => t.step.status === 'IN_PROGRESS').length;
  const avgProgress = totalAssigned
    ? Math.round(
        allTasks.reduce((a, t) => a + (t.step.progressPct ?? statusToProgress(t.step.status)), 0) / totalAssigned,
      )
    : 0;

  const groupedByFloor = useMemo(() => {
    const map = new Map<string, { floorName: string; tasks: typeof allTasks }>();
    for (const t of allTasks) {
      if (!map.has(t.floorId)) map.set(t.floorId, { floorName: t.floorName, tasks: [] });
      map.get(t.floorId)!.tasks.push(t);
    }
    return Array.from(map.entries());
  }, [allTasks]);

  const painters = project.painters ?? [];
  const activePainters = painters.filter((p) => p.clockState === 'CLOCKED_IN' || p.clockState === 'ON_BREAK' || p.checkedIn);
  const todaysTargets = (project.dailyTargets ?? []).filter((t) => t.date === todayISO());

  const handleCheckIn = () => {
    const now = new Date();
    setCheckInTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
  };

  useEffect(() => {
    const anyActive = painters.some((p) => p.clockState && p.clockState !== 'CLOCKED_OUT');
    if (!anyActive) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [painters]);

  const handleConfirmDailyLog = (form: DailyLogForm) => {
    onSubmitDailyLog(form);
    setShowDailyLog(false);
  };

  // Pending photo audit items
  const pendingAudits = useMemo(() => {
    const result: { floorId: string; floorName: string; roomId: string; roomName: string; step: FinishingStep; painterName: string }[] = [];
    for (const floor of project.floors ?? []) {
      for (const room of floor.rooms ?? []) {
        for (const step of room.finishingSteps ?? []) {
          if ((step.beforePhotoUrl || step.afterPhotoUrl) && step.photoAuditStatus === 'PENDING_REVIEW') {
            const painter = painters.find((p) => step.painterIds?.includes(p.id));
            result.push({
              floorId: floor.id,
              floorName: floor.name,
              roomId: room.id,
              roomName: room.name,
              step,
              painterName: painter?.name ?? 'Unassigned',
            });
          }
        }
      }
    }
    return result;
  }, [project, painters]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
      {/* Supervisor header card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white/20 backdrop-blur-sm">
              <UserCircle2 size={26} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/70">Supervisor Portal</p>
              <h2 className="text-lg font-bold">{supervisor.name}</h2>
              <p className="text-xs text-white/70">{supervisor.role}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{avgProgress}%</p>
            <p className="text-xs text-white/70">Overall Progress</p>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-white/15 bg-white/10">
          <MiniStat label="Total Steps" value={totalAssigned} />
          <MiniStat label="In Progress" value={inProgressTasks} />
          <MiniStat label="Completed" value={completedTasks} />
        </div>
      </div>

      {/* Painter attendance + GPS geofenced tracker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Painter Attendance & GPS Tracker</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {painters.filter((p) => p.clockState === 'CLOCKED_IN' || p.clockState === 'ON_BREAK').length} active · {painters.filter((p) => p.gpsVerified).length} GPS verified
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTargetAllocator(true)}
            disabled={painters.filter((p) => p.clockState === 'CLOCKED_IN' || p.clockState === 'ON_BREAK' || p.checkedIn).length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50"
          >
            <Target size={14} />
            Allocate Daily Targets
          </button>
        </div>

        {/* GPS geofenced painter list */}
        <div className="grid gap-2 sm:grid-cols-2">
          {painters.map((p) => {
            const cState: ClockState = p.clockState ?? 'CLOCKED_OUT';
            const isActive = cState === 'CLOCKED_IN' || cState === 'ON_BREAK';
            const elapsed = p.clockInAt ? Date.now() - p.clockInAt - (p.totalBreakMs ?? 0) - (p.breakStartAt ? Date.now() - p.breakStartAt : 0) : 0;
            const stateCfg: Record<ClockState, { label: string; color: string; dot: string }> = {
              CLOCKED_OUT: { label: 'Off-site', color: 'text-slate-400', dot: 'bg-slate-300' },
              CLOCKED_IN: { label: 'On-site', color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
              ON_BREAK: { label: 'On break', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
            };
            const cfg = stateCfg[cState];
            return (
              <div
                key={p.id}
                className={`rounded-lg border px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
                    : 'border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.name}</p>
                      <div className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${isActive ? 'animate-pulse' : ''}`} />
                        <p className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</p>
                        {p.gpsVerified && isActive && (
                          <span className="ml-1 flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            <MapPin size={9} />
                            GPS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isActive && (
                      <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {fmtDuration(elapsed)}
                      </span>
                    )}
                    <button
                      onClick={() => onTogglePainterCheckIn(p.id)}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                        p.checkedIn
                          ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {p.checkedIn ? <LogOut size={11} /> : <LogIn size={11} />}
                      {p.checkedIn ? 'Out' : 'In'}
                    </button>
                  </div>
                </div>
                {isActive && p.siteLabel && (
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                    <MapPin size={10} className="text-slate-400" />
                    {p.gpsVerified ? `${p.siteLabel} (GPS Verified)` : p.siteLabel}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Check-In Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${
            checkInTime
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
          }`}>
            <Sun size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Morning Site Check-In</p>
            {checkInTime ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} />
                Checked In at {checkInTime}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <Clock size={13} />
                Not checked in yet
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleCheckIn}
          disabled={!!checkInTime}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors active:scale-95 ${
            checkInTime
              ? 'cursor-default bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-brand-500 text-white shadow-md shadow-brand-500/20 hover:bg-brand-600'
          }`}
        >
          {checkInTime ? 'Checked In' : 'Check In'}
        </button>
      </div>

      {/* Action button */}
      <button
        onClick={() => setShowDailyLog(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <ClipboardList size={17} />
        Submit Daily Log
      </button>

      {/* Pending Site Approvals — Photo Audit Vault */}
      {pendingAudits.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <ClipboardCheck size={16} className="text-amber-500" />
            Pending Site Approvals
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              {pendingAudits.length}
            </span>
          </h3>
          <div className="space-y-3">
            {pendingAudits.map((audit) => (
              <PhotoAuditCard
                key={audit.step.id}
                floorName={audit.floorName}
                roomName={audit.roomName}
                step={audit.step}
                painterName={audit.painterName}
                onApprove={() => onPhotoAudit(audit.floorId, audit.roomId, audit.step.id, true)}
                onReject={() => onPhotoAudit(audit.floorId, audit.roomId, audit.step.id, false)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Tasks */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Brush size={16} className="text-brand-500" />
          Project Tasks
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {totalAssigned}
          </span>
        </h3>

        {groupedByFloor.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
            No tasks found for this project.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByFloor.map(([floorId, group]) => {
              const open = openFloors.has(floorId);
              return (
                <div key={floorId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
                  <button
                    onClick={() => toggleFloor(floorId)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers size={15} className="text-brand-500" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.floorName}</span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </button>
                  {open && (
                    <div className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
                      {group.tasks.map(({ floorId: fId, roomId, roomName, step }) => (
                        <SupervisorTaskCard
                          key={step.id}
                          step={step}
                          roomName={roomName}
                          floorId={fId}
                          roomId={roomId}
                          painters={painters}
                          onProgress={onTaskProgress}
                          onPainterAssign={onPainterAssign}
                          onQaRequired={(s) => setQaTarget({ floorId: fId, roomId, step: s, roomName })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Daily Logs */}
      {(project.dailyLogs ?? []).filter((l) => l.supervisorId === supervisor.id).length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <FileText size={16} className="text-brand-500" />
            Recent Daily Logs
          </h3>
          <div className="space-y-2">
            {(project.dailyLogs ?? []).filter((l) => l.supervisorId === supervisor.id).slice(-3).reverse().map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                    <Calendar size={13} className="text-slate-400" />
                    {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Users size={13} />
                    {log.attendanceCount} painters
                  </span>
                </div>
                {log.consumption.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {log.consumption.map((c, i) => (
                      <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {c.materialName}: {c.quantityUsed} {c.unit}
                      </span>
                    ))}
                  </div>
                )}
                {log.issues && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {log.issues}
                  </p>
                )}
                {log.notes && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{log.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showDailyLog && (
        <DailyLogModal
          materials={project.materialBillOfQuantities}
          supervisorName={supervisor.name}
          onClose={() => setShowDailyLog(false)}
          onConfirm={handleConfirmDailyLog}
        />
      )}
      {showTargetAllocator && (
        <DailyTargetAllocatorModal
          project={project}
          painters={activePainters}
          onClose={() => setShowTargetAllocator(false)}
          onAssign={onAssignDailyTarget}
        />
      )}
      {qaTarget && (
        <QaInspectionModal
          stepName={qaTarget.step.name}
          roomName={qaTarget.roomName}
          onClose={() => setQaTarget(null)}
          onApprove={(form) => {
            onQaApprove(qaTarget.floorId, qaTarget.roomId, qaTarget.step.id, form);
            setQaTarget(null);
          }}
        />
      )}
    </div>
  );
}

function SupervisorTaskCard({
  step,
  roomName,
  floorId,
  roomId,
  painters,
  onProgress,
  onPainterAssign,
  onQaRequired,
}: {
  step: FinishingStep;
  roomName: string;
  floorId: string;
  roomId: string;
  painters: Painter[];
  onProgress: (floorId: string, roomId: string, stepId: string, progressPct: number, status: TaskStatus) => void;
  onPainterAssign: (floorId: string, roomId: string, stepId: string, painterIds: string[]) => void;
  onQaRequired: (step: FinishingStep) => void;
}) {
  const currentProgress = step.progressPct ?? statusToProgress(step.status);
  const [painterMenuOpen, setPainterMenuOpen] = useState(false);

  const setProgress = (pct: number) => {
    const status = progressToStatus(pct);
    if (pct >= 100 && !step.qaVerified) {
      onQaRequired({ ...step, progressPct: pct, status });
      return;
    }
    onProgress(floorId, roomId, step.id, pct, status);
  };

  const togglePainter = (painterId: string) => {
    const current = step.painterIds ?? [];
    const next = current.includes(painterId) ? current.filter((id) => id !== painterId) : [...current, painterId];
    onPainterAssign(floorId, roomId, step.id, next);
  };

  const assignedPainters = painters.filter((p) => step.painterIds?.includes(p.id));
  const quickButtons = [25, 50, 75, 100];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700/70 dark:bg-slate-800/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${stepIconClass(step.name)}`}>
            <Brush size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{step.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {roomName} · {step.surface}
              {step.stepSqft != null && ` · ${step.stepSqft} sqft`}
            </p>
          </div>
        </div>
        <StatusBadge status={step.status} size="sm" />
      </div>

      {step.brand && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Brand: <span className="font-semibold text-slate-700 dark:text-slate-200">{step.brand}</span>
          {step.productLine && ` · ${step.productLine}`}
        </p>
      )}

      {step.qaVerified && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <ClipboardCheck size={11} />
          QA Verified
        </div>
      )}

      {/* Painter allocation */}
      <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700/70">
        <div className="relative">
          <button
            onClick={() => setPainterMenuOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-brand-500" />
              {assignedPainters.length > 0 ? assignedPainters.map((p) => p.name).join(', ') : 'Assign Painters'}
            </span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>
          {painterMenuOpen && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
              {painters.map((p) => {
                const checked = step.painterIds?.includes(p.id) ?? false;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePainter(p.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${
                      checked ? 'text-brand-700 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border-2 transition-colors ${
                      checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {checked && <Check size={11} />}
                    </span>
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Progress slider */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <TrendingUp size={12} />
            Progress
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{currentProgress}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={currentProgress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-500 dark:bg-slate-700"
        />
      </div>

      {/* Quick action buttons */}
      <div className="mt-3 flex items-center gap-1.5">
        {quickButtons.map((pct) => (
          <button
            key={pct}
            onClick={() => setProgress(pct)}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
              currentProgress === pct
                ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {pct === 100 ? 'Done' : `${pct}%`}
          </button>
        ))}
      </div>
    </div>
  );
}

function DailyTargetAllocatorModal({
  project,
  painters,
  onClose,
  onAssign,
}: {
  project: PaintProject;
  painters: Painter[];
  onClose: () => void;
  onAssign: (painterId: string, floorId: string, roomId: string, stepId: string, targetSqft: number) => void;
}) {
  const [selectedPainter, setSelectedPainter] = useState<string>(painters[0]?.id ?? '');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedStep, setSelectedStep] = useState<string>('');
  const [targetSqft, setTargetSqft] = useState<number>(0);

  const floors = project.floors ?? [];
  const rooms = floors.find((f) => f.id === selectedFloor)?.rooms ?? [];
  const steps = rooms.find((r) => r.id === selectedRoom)?.finishingSteps ?? [];

  const handleAssign = () => {
    if (!selectedPainter || !selectedFloor || !selectedRoom || !selectedStep || targetSqft <= 0) return;
    onAssign(selectedPainter, selectedFloor, selectedRoom, selectedStep, targetSqft);
    setSelectedStep('');
    setTargetSqft(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <Target size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Daily SqFt Target Allocator</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Assign today's target to checked-in painters</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {/* Painter selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Painter (Checked In)</label>
            <select
              value={selectedPainter}
              onChange={(e) => setSelectedPainter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {painters.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Floor selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Floor</label>
            <select
              value={selectedFloor}
              onChange={(e) => { setSelectedFloor(e.target.value); setSelectedRoom(''); setSelectedStep(''); }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Select floor...</option>
              {floors.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Room selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Room</label>
            <select
              value={selectedRoom}
              onChange={(e) => { setSelectedRoom(e.target.value); setSelectedStep(''); }}
              disabled={!selectedFloor}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Select room...</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.interiorSqft ?? 0} sqft)</option>
              ))}
            </select>
          </div>

          {/* Step selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Task Step</label>
            <select
              value={selectedStep}
              onChange={(e) => {
                setSelectedStep(e.target.value);
                const step = steps.find((s) => s.id === e.target.value);
                if (step?.stepSqft) setTargetSqft(step.stepSqft);
              }}
              disabled={!selectedRoom}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Select step...</option>
              {steps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.stepNumber}. {s.name} ({s.stepSqft ?? 0} sqft)
                </option>
              ))}
            </select>
          </div>

          {/* Target SqFt */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
              <Ruler size={12} className="mr-1 inline" />
              Target SqFt for Today
            </label>
            <input
              type="number"
              value={targetSqft}
              onChange={(e) => setTargetSqft(Number(e.target.value))}
              min={0}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Close
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedPainter || !selectedStep || targetSqft <= 0}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50"
          >
            <Plus size={15} />
            Assign Target
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">{label}</p>
    </div>
  );
}

function fmtDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function PhotoAuditCard({
  floorName,
  roomName,
  step,
  painterName,
  onApprove,
  onReject,
}: {
  floorName: string;
  roomName: string;
  step: FinishingStep;
  painterName: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const timestamp = step.afterPhotoAt ?? step.beforePhotoAt;
  const timeStr = timestamp
    ? new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : 'Unknown';

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-card dark:border-amber-500/30 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${stepIconClass(step.name)}`}>
            <Brush size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{step.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{floorName} · {roomName}</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          Pending Review
        </span>
      </div>

      <div className="p-4">
        {/* Photos */}
        <div className="flex gap-3">
          {step.beforePhotoUrl && (
            <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <img src={step.beforePhotoUrl} alt="Before" className="h-32 w-full object-cover" />
              <span className="absolute bottom-0 left-0 bg-slate-900/70 px-2 py-0.5 text-[10px] font-medium text-white">Before</span>
            </div>
          )}
          {step.afterPhotoUrl && (
            <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <img src={step.afterPhotoUrl} alt="After" className="h-32 w-full object-cover" />
              <span className="absolute bottom-0 left-0 bg-slate-900/70 px-2 py-0.5 text-[10px] font-medium text-white">After</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <UserCircle2 size={12} />
            {painterName}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {timeStr}
          </span>
          {step.photoGpsVerified && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <MapPin size={12} />
              GPS Verified
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onReject}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-red-50 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 active:scale-[0.98] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
          >
            <X size={16} />
            Reject & Rework
          </button>
          <button
            onClick={onApprove}
            className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-colors hover:bg-emerald-600 active:scale-[0.98]"
          >
            <CheckCircle2 size={18} />
            Approve Quality
          </button>
        </div>
      </div>
    </div>
  );
}
