import { useState } from 'react';
import {
  Layers,
  ChevronDown,
  Ruler,
  CheckCircle2,
  Clock,
  Circle,
  Package,
} from 'lucide-react';
import type { PaintProject, FinishingStep, TaskStatus } from '@/types';
import { STATUS_STYLES } from '@/utils';

interface TasksTabProps {
  project: PaintProject;
  onTaskChange: (floorId: string, roomId: string, stepId: string, progressPct: number, status: TaskStatus) => void;
}

const STATUS_FILTERS: { id: 'ALL' | TaskStatus; label: string }[] = [
  { id: 'ALL', label: 'All Steps' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
];

export function TasksTab({ project, onTaskChange }: TasksTabProps) {
  const [filter, setFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [openFloors, setOpenFloors] = useState<Set<string>>(
    () => new Set(project.floors?.map((f) => f.id) ?? []),
  );

  const toggleFloor = (id: string) =>
    setOpenFloors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.id
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Floor → Room → 10-step workflow */}
      <div className="space-y-3">
        {(project.floors ?? []).map((floor) => {
          const open = openFloors.has(floor.id);
          const rooms = floor.rooms ?? [];
          const allSteps = rooms.flatMap((r) => r.finishingSteps ?? []);
          const visibleSteps = filter === 'ALL' ? allSteps : allSteps.filter((s) => s.status === filter);

          return (
            <div
              key={floor.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900"
            >
              <button
                onClick={() => toggleFloor(floor.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-2.5">
                  <Layers size={15} className="text-brand-500" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{floor.name}</span>
                  <span className="text-xs text-slate-400">{rooms.length} rooms</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{visibleSteps.length} steps</span>
                  <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {open && (
                <div className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-800">
                  {rooms.map((room) => {
                    const steps = room.finishingSteps ?? [];
                    const visible = filter === 'ALL' ? steps : steps.filter((s) => s.status === filter);
                    if (visible.length === 0) return null;

                    return (
                      <div key={room.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{room.name}</span>
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Ruler size={11} />
                              {room.interiorSqft ?? 0} sqft
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {steps.filter((s) => s.status === 'COMPLETED').length}/{steps.length} done
                          </span>
                        </div>

                        {/* Sequential 10-step workflow */}
                        <div className="space-y-2">
                          {visible.map((step) => (
                            <StepRow
                              key={step.id}
                              step={step}
                              onStatusChange={(status) => {
                                const pct = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 50 : 0;
                                onTaskChange(floor.id, room.id, step.id, pct, status);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepRow({
  step,
  onStatusChange,
}: {
  step: FinishingStep;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const style = STATUS_STYLES[step.status];
  const StatusIcon = step.status === 'COMPLETED' ? CheckCircle2 : step.status === 'IN_PROGRESS' ? Clock : Circle;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 transition-colors hover:border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600">
      {/* Step number */}
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          {step.stepNumber ?? ''}
        </span>
      </div>

      {/* Step info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{step.name}</p>
          {step.brand && (
            <span className="hidden items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 sm:inline-flex dark:bg-brand-500/10 dark:text-brand-400">
              <Package size={9} />
              {step.brand}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
          {step.stepSqft != null && (
            <span className="flex items-center gap-1">
              <Ruler size={10} />
              {step.stepSqft} sqft
            </span>
          )}
          {step.productLine && <span className="truncate">{step.productLine}</span>}
          {step.qaVerified && (
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={11} />
              QA
            </span>
          )}
        </div>
      </div>

      {/* Status badge + selector */}
      <div className="flex shrink-0 items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>
          <StatusIcon size={11} />
          {style.label}
        </span>
        <select
          value={step.status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
    </div>
  );
}
