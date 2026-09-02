import { useMemo, useState, useEffect, useRef } from 'react';
import {
  UserCircle2,
  Layers,
  Brush,
  Play,
  Pause,
  CheckCircle2,
  Ruler,
  Target,
  Camera,
  X,
  ClipboardCheck,
  LogIn,
  LogOut,
  Coffee,
  MapPin,
  Timer,
} from 'lucide-react';
import type { PaintProject, Painter, FinishingStep, TaskStatus, DailyTarget, ClockState } from '@/types';
import { todayISO } from '@/utils';

interface PainterPortalProps {
  project: PaintProject;
  painter: Painter;
  onTaskStatusChange: (floorId: string, roomId: string, stepId: string, progressPct: number, status: TaskStatus) => void;
  onPhotoUpload: (floorId: string, roomId: string, stepId: string, type: 'before' | 'after', url: string) => void;
  onClockChange: (painterId: string, state: ClockState) => void;
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

const SITE_LABEL = 'Koramangala Site';
const SITE_LAT = 12.9352;
const SITE_LNG = 77.6245;
const GPS_TOLERANCE_KM = 0.5;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function PainterPortal({
  project,
  painter,
  onTaskStatusChange,
  onPhotoUpload,
  onClockChange,
}: PainterPortalProps) {
  const [openFloors, setOpenFloors] = useState<Set<string>>(
    () => new Set(project.floors?.map((f) => f.id) ?? []),
  );
  const [photoStep, setPhotoStep] = useState<{
    floorId: string;
    roomId: string;
    step: FinishingStep;
    type: 'before' | 'after';
  } | null>(null);
  const [, setTick] = useState(0);

  const clockState: ClockState = painter.clockState ?? 'CLOCKED_OUT';
  const clockInAt = painter.clockInAt ?? null;
  const breakStartAt = painter.breakStartAt ?? null;
  const totalBreakMs = painter.totalBreakMs ?? 0;
  const gpsVerified = painter.gpsVerified ?? false;

  useEffect(() => {
    if (clockState === 'CLOCKED_OUT') return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [clockState]);

  const elapsedMs = clockInAt ? Date.now() - clockInAt - totalBreakMs - (breakStartAt ? Date.now() - breakStartAt : 0) : 0;

  const handlePunchIn = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const dist = haversineKm(pos.coords.latitude, pos.coords.longitude, SITE_LAT, SITE_LNG);
          onClockChange(painter.id, 'CLOCKED_IN');
          if (dist <= GPS_TOLERANCE_KM) {
            // verified — the handler in Dashboard sets gpsVerified + siteLabel
          }
        },
        () => onClockChange(painter.id, 'CLOCKED_IN'),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      onClockChange(painter.id, 'CLOCKED_IN');
    }
  };

  const handleBreak = () => {
    onClockChange(painter.id, 'ON_BREAK');
  };

  const handleResumeFromBreak = () => {
    onClockChange(painter.id, 'CLOCKED_IN');
  };

  const handlePunchOut = () => {
    onClockChange(painter.id, 'CLOCKED_OUT');
  };

  const toggleFloor = (id: string) =>
    setOpenFloors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const todaysTargets = useMemo(
    () => (project.dailyTargets ?? []).filter((t) => t.painterId === painter.id && t.date === todayISO()),
    [project.dailyTargets, painter.id],
  );

  const assignedTasks = useMemo(() => {
    const result: { floorId: string; floorName: string; roomId: string; roomName: string; roomInteriorSqft?: number; step: FinishingStep }[] = [];
    for (const floor of project.floors ?? []) {
      for (const room of floor.rooms ?? []) {
        for (const step of room.finishingSteps ?? []) {
          if (step.painterIds?.includes(painter.id)) {
            result.push({
              floorId: floor.id,
              floorName: floor.name,
              roomId: room.id,
              roomName: room.name,
              roomInteriorSqft: room.interiorSqft,
              step,
            });
          }
        }
      }
    }
    return result;
  }, [project, painter.id]);

  const totalAssigned = assignedTasks.length;
  const completedTasks = assignedTasks.filter((t) => t.step.status === 'COMPLETED').length;

  const groupedByFloor = useMemo(() => {
    const map = new Map<string, { floorName: string; tasks: typeof assignedTasks }>();
    for (const t of assignedTasks) {
      if (!map.has(t.floorId)) map.set(t.floorId, { floorName: t.floorName, tasks: [] });
      map.get(t.floorId)!.tasks.push(t);
    }
    return Array.from(map.entries());
  }, [assignedTasks]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-in">
      {/* Painter header card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-card">
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur-sm">
              <UserCircle2 size={26} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/60">Painter Portal</p>
              <h2 className="text-lg font-bold">{painter.name}</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{completedTasks}/{totalAssigned}</p>
            <p className="text-xs text-white/60">Tasks Done</p>
          </div>
        </div>
      </div>

      {/* Clock-In / Clock-Out Card */}
      <ClockInCard
        clockState={clockState}
        elapsedMs={elapsedMs}
        gpsVerified={gpsVerified}
        siteLabel={painter.siteLabel ?? SITE_LABEL}
        onPunchIn={handlePunchIn}
        onBreak={handleBreak}
        onResume={handleResumeFromBreak}
        onPunchOut={handlePunchOut}
      />

      {/* Today's Daily Targets */}
      {todaysTargets.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Target size={16} className="text-brand-500" />
            Today's SqFt Targets
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {todaysTargets.length}
            </span>
          </h3>
          <div className="space-y-3">
            {todaysTargets.map((target) => (
              <DailyTargetCard
                key={target.id}
                target={target}
                project={project}
                onStatusChange={onTaskStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Task cards */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Brush size={16} className="text-brand-500" />
          My Assigned Tasks
        </h3>
        {groupedByFloor.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
            No tasks assigned to you yet. Ask your supervisor to assign tasks.
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
                      {group.tasks.map(({ floorId: fId, roomId, roomName, roomInteriorSqft, step }) => (
                        <PainterTaskCard
                          key={step.id}
                          step={step}
                          roomName={roomName}
                          roomInteriorSqft={roomInteriorSqft}
                          floorId={fId}
                          roomId={roomId}
                          onStatusChange={onTaskStatusChange}
                          onPhotoClick={(type) => setPhotoStep({ floorId: fId, roomId, step, type })}
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

      {/* Photo upload modal */}
      {photoStep && (
        <PhotoUploadModal
          step={photoStep.step}
          type={photoStep.type}
          currentUrl={
            photoStep.type === 'before'
              ? photoStep.step.beforePhotoUrl ?? ''
              : photoStep.step.afterPhotoUrl ?? ''
          }
          onClose={() => setPhotoStep(null)}
          onConfirm={(url) => {
            onPhotoUpload(photoStep.floorId, photoStep.roomId, photoStep.step.id, photoStep.type, url);
            setPhotoStep(null);
          }}
        />
      )}
    </div>
  );
}

function ClockInCard({
  clockState,
  elapsedMs,
  gpsVerified,
  siteLabel,
  onPunchIn,
  onBreak,
  onResume,
  onPunchOut,
}: {
  clockState: ClockState;
  elapsedMs: number;
  gpsVerified: boolean;
  siteLabel: string;
  onPunchIn: () => void;
  onBreak: () => void;
  onResume: () => void;
  onPunchOut: () => void;
}) {
  const isOut = clockState === 'CLOCKED_OUT';
  const isIn = clockState === 'CLOCKED_IN';
  const isBreak = clockState === 'ON_BREAK';

  const stateConfig = {
    CLOCKED_OUT: { label: 'Clocked Out', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', dot: 'bg-slate-400' },
    CLOCKED_IN: { label: 'On The Clock', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', dot: 'bg-emerald-500' },
    ON_BREAK: { label: 'On Break', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', dot: 'bg-amber-500' },
  };
  const cfg = stateConfig[clockState];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${cfg.bg} ${cfg.color}`}>
            <Timer size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Attendance & Hours</h3>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${cfg.dot} ${isIn || isBreak ? 'animate-pulse' : ''}`} />
              <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
            </div>
          </div>
        </div>
        {gpsVerified && (isIn || isBreak) && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <MapPin size={11} />
            GPS Verified
          </span>
        )}
      </div>

      <div className="p-5">
        {/* Live timer */}
        <div className="mb-4 rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/50">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Working Hours Today</p>
          <p className={`mt-1 font-mono text-3xl font-bold ${isOut ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
            {isOut ? '--:--:--' : fmtDuration(elapsedMs)}
          </p>
        </div>

        {/* GPS site label */}
        {(isIn || isBreak) && (
          <div className={`mb-4 flex items-center justify-center gap-1.5 rounded-lg ${cfg.bg} py-2 text-xs font-medium ${cfg.color}`}>
            <MapPin size={13} />
            {gpsVerified ? `On-Site (${siteLabel} GPS Verified)` : `On-Site (${siteLabel})`}
          </div>
        )}

        {/* Action buttons */}
        {isOut && (
          <button
            onClick={onPunchIn}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98]"
          >
            <LogIn size={20} />
            PUNCH IN
          </button>
        )}
        {isIn && (
          <div className="flex gap-2">
            <button
              onClick={onBreak}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-3.5 text-sm font-bold text-amber-600 transition-all hover:bg-amber-100 active:scale-[0.98] dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
            >
              <Coffee size={18} />
              TAKE BREAK
            </button>
            <button
              onClick={onPunchOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <LogOut size={18} />
              PUNCH OUT
            </button>
          </div>
        )}
        {isBreak && (
          <div className="flex gap-2">
            <button
              onClick={onResume}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98]"
            >
              <Play size={18} />
              RESUME WORK
            </button>
            <button
              onClick={onPunchOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <LogOut size={18} />
              PUNCH OUT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DailyTargetCard({
  target,
  project,
  onStatusChange,
}: {
  target: DailyTarget;
  project: PaintProject;
  onStatusChange: (floorId: string, roomId: string, stepId: string, progressPct: number, status: TaskStatus) => void;
}) {
  const floor = project.floors?.find((f) => f.id === target.floorId);
  const room = floor?.rooms?.find((r) => r.id === target.roomId);
  const step = room?.finishingSteps?.find((s) => s.id === target.stepId);

  if (!floor || !room || !step) return null;

  const isCompleted = target.status === 'COMPLETED' || step.status === 'COMPLETED';
  const isInProgress = target.status === 'IN_PROGRESS' || step.status === 'IN_PROGRESS';

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 shadow-card dark:border-brand-500/30 dark:from-brand-500/10 dark:to-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-white">
            <Target size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{step.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {floor.name} · {room.name}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          isCompleted
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
            : isInProgress
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        }`}>
          {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Assigned'}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 rounded-lg bg-white/60 p-3 dark:bg-slate-800/50">
        <div className="flex items-center gap-1.5">
          <Ruler size={14} className="text-brand-500" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Target:</span>
          <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{target.targetSqft} sqft</span>
        </div>
        {step.brand && (
          <div className="flex items-center gap-1.5">
            <Brush size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">{step.brand}</span>
          </div>
        )}
      </div>

      <div className="mt-3">
        {!isInProgress && !isCompleted && (
          <button
            onClick={() => {
              onStatusChange(target.floorId, target.roomId, target.stepId, 10, 'IN_PROGRESS');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-600 active:scale-[0.98]"
          >
            <Play size={18} />
            START WORK
          </button>
        )}
        {isInProgress && !isCompleted && (
          <div className="flex gap-2">
            <button
              onClick={() => onStatusChange(target.floorId, target.roomId, target.stepId, 0, 'PENDING')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Pause size={16} />
              PAUSE
            </button>
            <button
              onClick={() => onStatusChange(target.floorId, target.roomId, target.stepId, 100, 'COMPLETED')}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98]"
            >
              <CheckCircle2 size={18} />
              COMPLETE
            </button>
          </div>
        )}
        {isCompleted && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 size={18} />
            TARGET COMPLETED
          </div>
        )}
      </div>
    </div>
  );
}

function PainterTaskCard({
  step,
  roomName,
  roomInteriorSqft,
  floorId,
  roomId,
  onStatusChange,
  onPhotoClick,
}: {
  step: FinishingStep;
  roomName: string;
  roomInteriorSqft?: number;
  floorId: string;
  roomId: string;
  onStatusChange: (floorId: string, roomId: string, stepId: string, progressPct: number, status: TaskStatus) => void;
  onPhotoClick: (type: 'before' | 'after') => void;
}) {
  const isPending = step.status === 'PENDING';
  const isInProgress = step.status === 'IN_PROGRESS';
  const isCompleted = step.status === 'COMPLETED';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/70 dark:bg-slate-800/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${stepIconClass(step.name)}`}>
            <Brush size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{step.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{roomName}</p>
          </div>
        </div>
        {isCompleted && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckCircle2 size={12} />
            Done
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{step.surface}</span>
        {step.stepSqft != null && (
          <>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="flex items-center gap-1">
              <Ruler size={12} />
              {step.stepSqft} sqft
            </span>
          </>
        )}
        {roomInteriorSqft != null && (
          <>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>Room: {roomInteriorSqft.toLocaleString()} sqft</span>
          </>
        )}
      </div>

      {step.brand && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {step.brand}
          </span>
          {step.productLine && (
            <span className="text-slate-500 dark:text-slate-400">{step.productLine}</span>
          )}
        </div>
      )}

      {step.qaVerified && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <ClipboardCheck size={11} />
          QA Verified
        </div>
      )}

      {/* Photo previews */}
      {(step.beforePhotoUrl || step.afterPhotoUrl) && (
        <div className="mt-3 flex gap-2">
          {step.beforePhotoUrl && (
            <div className="relative flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <img src={step.beforePhotoUrl} alt="Before" className="h-20 w-full object-cover" />
              <span className="absolute bottom-0 left-0 bg-slate-900/70 px-1.5 py-0.5 text-[9px] font-medium text-white">Before</span>
            </div>
          )}
          {step.afterPhotoUrl && (
            <div className="relative flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <img src={step.afterPhotoUrl} alt="After" className="h-20 w-full object-cover" />
              <span className="absolute bottom-0 left-0 bg-slate-900/70 px-1.5 py-0.5 text-[9px] font-medium text-white">After</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3.5">
        {isPending && (
          <button
            onClick={() => onStatusChange(floorId, roomId, step.id, 10, 'IN_PROGRESS')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-600 active:scale-[0.98]"
          >
            <Play size={18} />
            START WORK
          </button>
        )}
        {isInProgress && (
          <div className="flex gap-2">
            <button
              onClick={() => onStatusChange(floorId, roomId, step.id, 0, 'PENDING')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Pause size={16} />
              PAUSE
            </button>
            <button
              onClick={() => onStatusChange(floorId, roomId, step.id, 100, 'COMPLETED')}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-[0.98]"
            >
              <CheckCircle2 size={18} />
              COMPLETE
            </button>
          </div>
        )}
        {isCompleted && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 size={18} />
            TASK COMPLETED
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <PhotoButton label="Before" url={step.beforePhotoUrl} onClick={() => onPhotoClick('before')} />
        <PhotoButton label="After" url={step.afterPhotoUrl} onClick={() => onPhotoClick('after')} />
      </div>
    </div>
  );
}

function PhotoButton({ label, url, onClick }: { label: string; url?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <Camera size={13} className={url ? 'text-emerald-500' : 'text-slate-400'} />
      {label}
      {url && <CheckCircle2 size={11} className="text-emerald-500" />}
    </button>
  );
}

function PhotoUploadModal({
  step,
  type,
  currentUrl,
  onClose,
  onConfirm,
}: {
  step: FinishingStep;
  type: 'before' | 'after';
  currentUrl: string;
  onClose: () => void;
  onConfirm: (url: string) => void;
}) {
  const [preview, setPreview] = useState<string>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const triggerFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{type === 'before' ? 'Before' : 'After'} Photo</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{step.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="space-y-3 px-5 py-5">
          {/* Preview */}
          {preview ? (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <img src={preview} alt="Preview" className="h-48 w-full object-cover" />
              <button
                onClick={() => { setPreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-slate-900/70 text-white transition-colors hover:bg-slate-900"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="grid h-48 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="text-center">
                <Camera size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-400">No photo selected</p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          {/* Upload buttons */}
          <div className="flex gap-2">
            <button
              onClick={triggerFilePicker}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Camera size={14} />
              Choose File
            </button>
            <button
              onClick={triggerCamera}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Camera size={14} />
              Take Photo
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(preview)}
            disabled={!preview}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50"
          >
            Save Photo
          </button>
        </div>
      </div>
    </div>
  );
}
