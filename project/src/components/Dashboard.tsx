import { useMemo, useState } from 'react';
import type {
  PaintProject,
  Supervisor,
  DailyLog,
  TaskStatus,
  QaRecord,
  Painter,
  VendorOrder,
  Vendor,
  DailyTarget,
  OrderStatus,
  ClockState,
} from '@/types';
import { TopBar, type Role } from './TopBar';
import { Tabs, type TabId } from './Tabs';
import { OverviewTab } from './OverviewTab';
import { TasksTab } from './TasksTab';
import { BomTab } from './BomTab';
import { SupervisorsTab } from './SupervisorsTab';
import { SupervisorPortal } from './SupervisorPortal';
import { PainterPortal } from './PainterPortal';
import type { DailyLogForm } from './DailyLogModal';
import type { QaForm } from './QaInspectionModal';
import type { VendorOrderForm } from './VendorOrderModal';
import { genId, todayISO } from '@/utils';

interface DashboardProps {
  projects: PaintProject[];
  onProjectsChange: (projects: PaintProject[]) => void;
}

export function Dashboard({ projects, onProjectsChange }: DashboardProps) {
  const [activeProjectId, setActiveProjectId] = useState<string>(
    () => projects[0]?.id ?? '',
  );
  const [tab, setTab] = useState<TabId>('overview');
  const [role, setRole] = useState<Role>('admin');
  const [activeSupervisorId, setActiveSupervisorId] = useState<string>('');
  const [activePainterId, setActivePainterId] = useState<string>('');

  const localProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId],
  );

  if (!localProject) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-500">
        No projects available.
      </div>
    );
  }

  const updateProject = (updater: (prev: PaintProject) => PaintProject) => {
    onProjectsChange(
      projects.map((p) => (p.id === localProject.id ? updater(p) : p)),
    );
  };

  const supervisors: Supervisor[] = localProject.supervisors ?? [];
  const painters: Painter[] = localProject.painters ?? [];

  const activeSupervisor =
    supervisors.find((s) => s.id === activeSupervisorId) ??
    supervisors.find((s) => s.id === localProject.leadSupervisorId) ??
    null;

  const activePainter =
    painters.find((p) => p.id === activePainterId) ?? painters[0] ?? null;

  const handleRoleChange = (r: Role) => {
    setRole(r);
    if (r === 'supervisor') {
      const supId = activeSupervisorId || localProject.leadSupervisorId || supervisors[0]?.id || '';
      if (supId) setActiveSupervisorId(supId);
    }
    if (r === 'painter' && !activePainterId && painters.length > 0) {
      setActivePainterId(painters[0].id);
    }
  };

  const handleTaskProgress = (
    floorId: string,
    roomId: string,
    stepId: string,
    progressPct: number,
    status: TaskStatus,
  ) => {
    updateProject((prev) => ({
      ...prev,
      floors: prev.floors.map((floor) =>
        floor.id !== floorId
          ? floor
          : {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.id !== roomId
                  ? room
                  : {
                      ...room,
                      finishingSteps: room.finishingSteps.map((step) =>
                        step.id !== stepId ? step : { ...step, progressPct, status },
                      ),
                    },
              ),
            },
      ),
    }));
  };

  const handlePainterAssign = (
    floorId: string,
    roomId: string,
    stepId: string,
    painterIds: string[],
  ) => {
    updateProject((prev) => ({
      ...prev,
      floors: prev.floors.map((floor) =>
        floor.id !== floorId
          ? floor
          : {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.id !== roomId
                  ? room
                  : {
                      ...room,
                      finishingSteps: room.finishingSteps.map((step) =>
                        step.id !== stepId ? step : { ...step, painterIds },
                      ),
                    },
              ),
            },
      ),
    }));
  };

  const handleQaApprove = (
    floorId: string,
    roomId: string,
    stepId: string,
    form: QaForm,
  ) => {
    const record: QaRecord = {
      id: genId('qa'),
      stepId,
      floorId,
      roomId,
      checklist: form.checklist,
      beforePhotoUrl: form.beforePhotoUrl || undefined,
      afterPhotoUrl: form.afterPhotoUrl || undefined,
      approvedBy: activeSupervisor?.name ?? 'Supervisor',
      approvedAt: new Date().toISOString(),
    };
    updateProject((prev) => ({
      ...prev,
      floors: prev.floors.map((floor) =>
        floor.id !== floorId
          ? floor
          : {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.id !== roomId
                  ? room
                  : {
                      ...room,
                      finishingSteps: room.finishingSteps.map((step) =>
                        step.id !== stepId
                          ? step
                          : {
                              ...step,
                              progressPct: 100,
                              status: 'COMPLETED' as TaskStatus,
                              qaVerified: true,
                              beforePhotoUrl: form.beforePhotoUrl || undefined,
                              afterPhotoUrl: form.afterPhotoUrl || undefined,
                            },
                      ),
                    },
              ),
            },
      ),
      qaRecords: [...(prev.qaRecords ?? []), record],
    }));
  };

  const handlePainterPhotoUpload = (
    floorId: string,
    roomId: string,
    stepId: string,
    type: 'before' | 'after',
    url: string,
  ) => {
    updateProject((prev) => ({
      ...prev,
      floors: prev.floors.map((floor) =>
        floor.id !== floorId
          ? floor
          : {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.id !== roomId
                  ? room
                  : {
                      ...room,
                      finishingSteps: room.finishingSteps.map((step) =>
                        step.id !== stepId
                          ? step
                          : {
                              ...step,
                              [type === 'before' ? 'beforePhotoUrl' : 'afterPhotoUrl']: url || undefined,
                              [type === 'before' ? 'beforePhotoAt' : 'afterPhotoAt']: Date.now(),
                              photoGpsVerified: true,
                              photoAuditStatus: 'PENDING_REVIEW' as const,
                            },
                      ),
                    },
              ),
            },
      ),
    }));
  };

  const handlePlaceVendorOrder = (form: VendorOrderForm) => {
    const order: VendorOrder = {
      id: genId('vord'),
      materialId: form.materialId,
      materialName: form.materialName,
      vendorName: form.vendorName,
      orderQty: form.orderQty,
      unit: form.unit,
      status: 'ORDERED',
      orderedAt: new Date().toISOString(),
      notes: form.notes || undefined,
    };
    updateProject((prev) => ({
      ...prev,
      vendorOrders: [...(prev.vendorOrders ?? []), order],
      materialBillOfQuantities: prev.materialBillOfQuantities.map((m) =>
        m.id !== form.materialId
          ? m
          : {
              ...m,
              orderedQty: (m.orderedQty ?? 0) + form.orderQty,
              orderStatus: 'ORDERED' as OrderStatus,
              vendorName: form.vendorName,
            },
      ),
    }));
  };

  const handleMarkDelivered = (materialId: string, deliveredQty: number) => {
    updateProject((prev) => ({
      ...prev,
      materialBillOfQuantities: prev.materialBillOfQuantities.map((m) =>
        m.id !== materialId
          ? m
          : {
              ...m,
              deliveredQty: (m.deliveredQty ?? 0) + deliveredQty,
              orderStatus: 'DELIVERED_AT_SITE' as OrderStatus,
            },
      ),
      vendorOrders: (prev.vendorOrders ?? []).map((o) =>
        o.materialId !== materialId
          ? o
          : {
              ...o,
              status: 'DELIVERED_AT_SITE' as OrderStatus,
              deliveredAt: new Date().toISOString(),
            },
      ),
    }));
  };

  const handleSubmitDailyLog = (
    form: DailyLogForm,
    supervisorId: string,
    supervisorName: string,
  ) => {
    const log: DailyLog = {
      id: genId('log'),
      supervisorId,
      supervisorName,
      date: form.date,
      attendanceCount: form.attendanceCount,
      notes: form.notes || undefined,
      issues: form.issues || undefined,
      consumption: form.consumption,
      submittedAt: new Date().toISOString(),
    };
    updateProject((prev) => ({
      ...prev,
      dailyLogs: [...(prev.dailyLogs ?? []), log],
    }));
  };

  const handleAssignDailyTarget = (
    painterId: string,
    floorId: string,
    roomId: string,
    stepId: string,
    targetSqft: number,
  ) => {
    const target: DailyTarget = {
      id: genId('tgt'),
      painterId,
      floorId,
      roomId,
      stepId,
      targetSqft,
      date: todayISO(),
      status: 'ASSIGNED',
    };
    updateProject((prev) => ({
      ...prev,
      dailyTargets: [...(prev.dailyTargets ?? []), target],
      floors: prev.floors.map((floor) =>
        floor.id !== floorId
          ? floor
          : {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.id !== roomId
                  ? room
                  : {
                      ...room,
                      finishingSteps: room.finishingSteps.map((step) =>
                        step.id !== stepId
                          ? step
                          : { ...step, painterIds: [...new Set([...(step.painterIds ?? []), painterId])] },
                      ),
                    },
              ),
            },
      ),
    }));
  };

  const handleTogglePainterCheckIn = (painterId: string) => {
    updateProject((prev) => ({
      ...prev,
      painters: (prev.painters ?? []).map((p) =>
        p.id !== painterId ? p : { ...p, checkedIn: !p.checkedIn },
      ),
    }));
  };

  const handleClockChange = (painterId: string, state: ClockState) => {
    updateProject((prev) => ({
      ...prev,
      painters: (prev.painters ?? []).map((p) => {
        if (p.id !== painterId) return p;
        const now = Date.now();
        const totalBreak = p.totalBreakMs ?? 0;
        if (state === 'CLOCKED_IN') {
          if (p.clockState === 'ON_BREAK' && p.breakStartAt) {
            return { ...p, clockState: state, totalBreakMs: totalBreak + (now - p.breakStartAt), breakStartAt: undefined, checkedIn: true };
          }
          return { ...p, clockState: state, clockInAt: now, clockOutAt: undefined, breakStartAt: undefined, gpsVerified: true, siteLabel: 'Koramangala Site', checkedIn: true };
        }
        if (state === 'ON_BREAK') {
          return { ...p, clockState: state, breakStartAt: now };
        }
        return { ...p, clockState: state, clockOutAt: now, breakStartAt: undefined, checkedIn: false };
      }),
    }));
  };

  const handleSetLeadSupervisor = (supervisorId: string) => {
    updateProject((prev) => ({
      ...prev,
      leadSupervisorId: supervisorId,
    }));
  };

  const handleAddVendor = (vendor: Vendor) => {
    updateProject((prev) => ({
      ...prev,
      vendors: [...(prev.vendors ?? []), vendor],
    }));
  };

  const handlePhotoAudit = (floorId: string, roomId: string, stepId: string, approved: boolean) => {
    updateProject((prev) => ({
      ...prev,
      floors: prev.floors.map((floor) =>
        floor.id !== floorId
          ? floor
          : {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.id !== roomId
                  ? room
                  : {
                      ...room,
                      finishingSteps: room.finishingSteps.map((step) =>
                        step.id !== stepId
                          ? step
                          : approved
                            ? { ...step, photoAuditStatus: 'APPROVED' as const, status: 'COMPLETED' as TaskStatus, progressPct: 100, qaVerified: true }
                            : { ...step, photoAuditStatus: 'REJECTED' as const, status: 'IN_PROGRESS' as TaskStatus, progressPct: Math.min(step.progressPct ?? 50, 50) },
                      ),
                    },
              ),
            },
      ),
    }));
  };

  const handleEmergencyPO = (materialId: string, vendorId: string, qty: number) => {
    const vendor = (localProject.vendors ?? []).find((v) => v.id === vendorId);
    const material = localProject.materialBillOfQuantities.find((m) => m.id === materialId);
    if (!vendor || !material) return;
    const order: VendorOrder = {
      id: genId('vord'),
      materialId,
      materialName: material.name,
      vendorName: vendor.storeName,
      orderQty: qty,
      unit: material.unit,
      status: 'ORDERED',
      orderedAt: new Date().toISOString(),
      notes: 'Emergency Instant PO',
    };
    updateProject((prev) => ({
      ...prev,
      vendorOrders: [...(prev.vendorOrders ?? []), order],
      materialBillOfQuantities: prev.materialBillOfQuantities.map((m) =>
        m.id !== materialId
          ? m
          : {
              ...m,
              orderedQty: (m.orderedQty ?? 0) + qty,
              orderStatus: 'ORDERED' as OrderStatus,
              vendorName: vendor.storeName,
              vendorId: vendor.id,
            },
      ),
    }));
  };

  return (
    <div className="min-h-screen">
      <TopBar
        project={localProject}
        projects={projects}
        activeProjectId={activeProjectId}
        onProjectChange={setActiveProjectId}
        role={role}
        activeSupervisor={activeSupervisor}
        activePainter={activePainter}
        onRoleChange={handleRoleChange}
        onSupervisorChange={setActiveSupervisorId}
        onPainterChange={setActivePainterId}
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {role === 'admin' && (
          <>
            <Tabs active={tab} onChange={setTab} />
            {tab === 'overview' && <OverviewTab project={localProject} onRaisePurchaseOrder={() => setTab('bom')} />}
            {tab === 'tasks' && (
              <TasksTab project={localProject} onTaskChange={handleTaskProgress} />
            )}
            {tab === 'bom' && (
              <BomTab
                project={localProject}
                onPlaceVendorOrder={handlePlaceVendorOrder}
                onMarkDelivered={handleMarkDelivered}
                onAddVendor={handleAddVendor}
                onEmergencyPO={handleEmergencyPO}
              />
            )}
            {tab === 'supervisors' && (
              <SupervisorsTab
                supervisors={supervisors}
                project={localProject}
                onSetLeadSupervisor={handleSetLeadSupervisor}
              />
            )}
          </>
        )}
        {role === 'supervisor' && activeSupervisor && (
          <SupervisorPortal
            project={localProject}
            supervisor={activeSupervisor}
            onTaskProgress={handleTaskProgress}
            onPainterAssign={handlePainterAssign}
            onQaApprove={handleQaApprove}
            onAssignDailyTarget={handleAssignDailyTarget}
            onTogglePainterCheckIn={handleTogglePainterCheckIn}
            onClockChange={handleClockChange}
            onPhotoAudit={handlePhotoAudit}
            onSubmitDailyLog={(form) =>
              handleSubmitDailyLog(form, activeSupervisor.id, activeSupervisor.name)
            }
          />
        )}
        {role === 'painter' && activePainter && (
          <PainterPortal
            project={localProject}
            painter={activePainter}
            onTaskStatusChange={handleTaskProgress}
            onPhotoUpload={handlePainterPhotoUpload}
            onClockChange={handleClockChange}
          />
        )}
      </div>
    </div>
  );
}
