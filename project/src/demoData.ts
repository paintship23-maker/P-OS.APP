import type {
  PaintProject,
  Room,
  FinishingStep,
  MaterialItem,
  Supervisor,
  Painter,
  Vendor,
  TaskStatus,
} from './types';

const STEP_DEFS: { name: string; brand?: string; productLine?: string }[] = [
  { name: 'Surface Cleaning & Sanding' },
  { name: 'Putty Coat 1', brand: 'Birla White', productLine: 'WallCare Putty' },
  { name: 'Intermediate Sanding' },
  { name: 'Putty Coat 2', brand: 'Birla White', productLine: 'WallCare Putty' },
  { name: 'Fine Sanding' },
  { name: 'Primer Coat 1', brand: 'Asian Paints', productLine: 'Tractor Acrylic Primer' },
  { name: 'Emulsion Coat 1', brand: 'Asian Paints', productLine: 'Royal Aspira' },
  { name: 'Emulsion Coat 2', brand: 'Asian Paints', productLine: 'Royal Aspira' },
  { name: 'Touchup & Detailing', brand: 'Asian Paints', productLine: 'Royal Aspira' },
  { name: 'QA Inspection' },
];

function genSteps(roomId: string, sqft: number, startProgress: number): FinishingStep[] {
  return STEP_DEFS.map((def, i) => {
    const stepNumber = i + 1;
    let status: TaskStatus = 'PENDING';
    let progressPct = 0;
    if (stepNumber <= startProgress) {
      status = 'COMPLETED';
      progressPct = 100;
    } else if (stepNumber === startProgress + 1) {
      status = 'IN_PROGRESS';
      progressPct = 50;
    }
    return {
      id: `${roomId}-step-${stepNumber}`,
      name: def.name,
      surface: 'Wall',
      stepNumber,
      stepSqft: sqft,
      status,
      progressPct,
      brand: def.brand,
      productLine: def.productLine,
      qaVerified: stepNumber === 10 && status === 'COMPLETED' ? true : undefined,
    };
  });
}

function makeRoom(id: string, name: string, sqft: number, startProgress: number): Room {
  return {
    id,
    name,
    interiorSqft: sqft,
    finishingSteps: genSteps(id, sqft, startProgress),
  };
}

const SHARED_SUPERVISORS: Supervisor[] = [
  { id: 'sup-1', name: 'Rajesh Kumar', role: 'Lead Supervisor', phone: '+91 99001 12345' },
  { id: 'sup-2', name: 'Suresh Patel', role: 'Site Supervisor', phone: '+91 99001 22345' },
  { id: 'sup-3', name: 'Mahesh Reddy', role: 'Lead Supervisor', phone: '+91 99001 32345' },
  { id: 'sup-4', name: 'Vijay Nair', role: 'Site Supervisor', phone: '+91 99001 42345' },
  { id: 'sup-5', name: 'Anand Gowda', role: 'Lead Supervisor', phone: '+91 99001 52345' },
];

const SHARED_PAINTERS: Painter[] = [
  { id: 'ptr-1', name: 'Ramesh', phone: '+91 80500 11111' },
  { id: 'ptr-2', name: 'Ganesh', phone: '+91 80500 22222' },
  { id: 'ptr-3', name: 'Manjunath', phone: '+91 80500 33333' },
  { id: 'ptr-4', name: 'Kiran', phone: '+91 80500 44444' },
  { id: 'ptr-5', name: 'Deepak', phone: '+91 80500 55555' },
  { id: 'ptr-6', name: 'Naveen', phone: '+91 80500 66666' },
];

function makeMaterials(
  items: { name: string; category: string; brand: string; qty: number; unit: string; vendor: string; ordered: number; delivered: number; status: MaterialItem['orderStatus']; unitCost: number }[],
): MaterialItem[] {
  return items.map((m, i) => ({
    id: `mat-${i + 1}`,
    name: m.name,
    category: m.category,
    brand: m.brand,
    totalRequiredQty: m.qty,
    unit: m.unit,
    vendorName: m.vendor,
    orderedQty: m.ordered,
    deliveredQty: m.delivered,
    orderStatus: m.status,
    unitCost: m.unitCost,
  }));
}

const SHARED_VENDORS: Vendor[] = [
  { id: 'ven-1', storeName: 'Sri Lakshmi Hardware', ownerName: 'Lakshmi Narayan', phone: '+91 80255 11234', address: '4th Block, Koramangala, Bangalore', brands: ['Asian Paints', 'Birla White', 'Carborundum Universal'], creditDays: 30 },
  { id: 'ven-2', storeName: 'Asian Paints Dealer - Koramangala', ownerName: 'Suresh Gowda', phone: '+91 80255 22345', address: '5th Block, Koramangala, Bangalore', brands: ['Asian Paints'], creditDays: 45 },
  { id: 'ven-3', storeName: 'Whitefield Hardware', ownerName: 'Ramesh Reddy', phone: '+91 80255 33456', address: 'Whitefield Main Road, Bangalore', brands: ['Asian Paints', 'Birla White', 'Berger'], creditDays: 30 },
  { id: 'ven-4', storeName: 'Indiranagar Hardware', ownerName: 'Ganesh Pillai', phone: '+91 80255 44567', address: '100 Feet Road, Indiranagar, Bangalore', brands: ['Asian Paints', 'Birla White', 'Purdy'], creditDays: 15 },
  { id: 'ven-5', storeName: 'Thanisandra Hardware', ownerName: 'Naveen Kumar', phone: '+91 80255 55678', address: 'Thanisandra Main Road, Bangalore', brands: ['Asian Paints', 'Birla White', 'Berger'], creditDays: 30 },
  { id: 'ven-6', storeName: 'Jayanagar Hardware', ownerName: 'Mohan Das', phone: '+91 80255 66789', address: '9th Block, Jayanagar, Bangalore', brands: ['Asian Paints', 'Birla White', 'Tesa', 'Purdy'], creditDays: 45 },
  { id: 'ven-7', storeName: 'Hardware Hub - Marathahalli', ownerName: 'Kiran Shetty', phone: '+91 80255 77890', address: 'Marathahalli Junction, Bangalore', brands: ['Tesa', 'Purdy', 'Carborundum Universal'], creditDays: 15 },
];

export const demoProjects: PaintProject[] = [
  {
    id: 'proj-001',
    projectDetails: {
      name: 'Riverside Villa - Koramangala',
      status: 'In Progress',
      totalSqft: 3200,
      estimatedDays: 45,
      actualDays: 28,
      startDate: '2025-07-01',
      endDate: '2025-08-15',
      totalBudget: 850000,
      totalMaterialCost: 320000,
      totalLaborCost: 280000,
      estimatedProfitMargin: 29.4,
      dailyPainterRate: 850,
    },
    customerDetails: {
      name: 'Mr. Arun Sharma',
      phone: '+91 98450 11223',
      address: '4th Block, Koramangala, Bangalore - 560034',
    },
    leadSupervisorId: 'sup-1',
    supervisors: SHARED_SUPERVISORS,
    painters: SHARED_PAINTERS.map((p, i) => ({
      ...p,
      checkedIn: i < 4,
    })),
    vendors: SHARED_VENDORS,
    floors: [
      {
        id: 'p1-gf',
        name: 'Ground Floor',
        level: 0,
        rooms: [
          makeRoom('p1-living', 'Living Room', 340, 8),
          makeRoom('p1-dining', 'Dining Room', 220, 7),
          makeRoom('p1-kitchen', 'Kitchen', 180, 6),
        ],
      },
      {
        id: 'p1-ff',
        name: 'First Floor',
        level: 1,
        rooms: [
          makeRoom('p1-mbr', 'Master Bedroom', 380, 5),
          makeRoom('p1-br2', 'Bedroom 2', 260, 4),
          makeRoom('p1-br3', 'Bedroom 3', 220, 3),
        ],
      },
    ],
    materialBillOfQuantities: makeMaterials([
      { name: 'WallCare Putty', category: 'Putty', brand: 'Birla White', qty: 120, unit: 'kg', vendor: 'Sri Lakshmi Hardware - Koramangala', ordered: 120, delivered: 120, status: 'DELIVERED_AT_SITE', unitCost: 45 },
      { name: 'Tractor Acrylic Primer', category: 'Primer', brand: 'Asian Paints', qty: 80, unit: 'L', vendor: 'Sri Lakshmi Hardware - Koramangala', ordered: 80, delivered: 40, status: 'ORDERED', unitCost: 180 },
      { name: 'Royal Aspira Emulsion', category: 'Emulsion', brand: 'Asian Paints', qty: 160, unit: 'L', vendor: 'Asian Paints Dealer - Koramangala', ordered: 0, delivered: 0, status: 'PENDING_STORE_ORDER', unitCost: 520 },
      { name: 'Sandpaper Assorted', category: 'Abrasives', brand: 'Carborundum Universal', qty: 50, unit: 'sheets', vendor: 'Sri Lakshmi Hardware - Koramangala', ordered: 50, delivered: 50, status: 'DELIVERED_AT_SITE', unitCost: 25 },
      { name: 'Brush & Roller Set', category: 'Tools', brand: 'Purdy', qty: 20, unit: 'pcs', vendor: 'Hardware Hub - Indiranagar', ordered: 0, delivered: 0, status: 'PENDING_STORE_ORDER', unitCost: 350 },
    ]),
    vendorOrders: [],
    dailyLogs: [],
    qaRecords: [],
    dailyTargets: [],
  },
  {
    id: 'proj-002',
    projectDetails: {
      name: 'Prestige Lakes - Whitefield',
      status: 'In Progress',
      totalSqft: 5800,
      estimatedDays: 60,
      actualDays: 15,
      startDate: '2025-07-15',
      endDate: '2025-09-15',
      totalBudget: 1450000,
      totalMaterialCost: 580000,
      totalLaborCost: 420000,
      estimatedProfitMargin: 30.3,
      dailyPainterRate: 900,
    },
    customerDetails: {
      name: 'Mrs. Priya Iyer',
      phone: '+91 98450 22334',
      address: 'Prestige Lakeside Apt, Whitefield, Bangalore - 560066',
    },
    leadSupervisorId: 'sup-2',
    supervisors: SHARED_SUPERVISORS,
    painters: SHARED_PAINTERS.map((p, i) => ({
      ...p,
      checkedIn: i < 3,
    })),
    vendors: SHARED_VENDORS,
    floors: [
      {
        id: 'p2-gf',
        name: 'Ground Floor',
        level: 0,
        rooms: [
          makeRoom('p2-living', 'Living Room', 480, 5),
          makeRoom('p2-dining', 'Dining Room', 300, 4),
          makeRoom('p2-kitchen', 'Kitchen', 240, 3),
          makeRoom('p2-pooja', 'Pooja Room', 80, 2),
        ],
      },
      {
        id: 'p2-ff',
        name: 'First Floor',
        level: 1,
        rooms: [
          makeRoom('p2-mbr', 'Master Bedroom', 420, 2),
          makeRoom('p2-br2', 'Bedroom 2', 320, 1),
          makeRoom('p2-br3', 'Bedroom 3', 280, 1),
          makeRoom('p2-kids', 'Kids Room', 220, 0),
        ],
      },
    ],
    materialBillOfQuantities: makeMaterials([
      { name: 'WallCare Putty', category: 'Putty', brand: 'Birla White', qty: 200, unit: 'kg', vendor: 'Whitefield Hardware - Whitefield', ordered: 200, delivered: 100, status: 'ORDERED', unitCost: 45 },
      { name: 'Tractor Acrylic Primer', category: 'Primer', brand: 'Asian Paints', qty: 140, unit: 'L', vendor: 'Asian Paints Dealer - Whitefield', ordered: 0, delivered: 0, status: 'PENDING_STORE_ORDER', unitCost: 180 },
      { name: 'Royal Aspira Emulsion', category: 'Emulsion', brand: 'Asian Paints', qty: 280, unit: 'L', vendor: 'Asian Paints Dealer - Whitefield', ordered: 0, delivered: 0, status: 'PENDING_STORE_ORDER', unitCost: 520 },
      { name: 'Weathercoat Exterior', category: 'Exterior', brand: 'Berger', qty: 120, unit: 'L', vendor: 'Berger Paints Dealer - Whitefield', ordered: 60, delivered: 0, status: 'ORDERED', unitCost: 380 },
      { name: 'Sandpaper Assorted', category: 'Abrasives', brand: 'Carborundum Universal', qty: 80, unit: 'sheets', vendor: 'Whitefield Hardware - Whitefield', ordered: 80, delivered: 80, status: 'DELIVERED_AT_SITE', unitCost: 25 },
      { name: 'Masking Tape', category: 'Consumables', brand: 'Tesa', qty: 40, unit: 'rolls', vendor: 'Hardware Hub - Marathahalli', ordered: 0, delivered: 0, status: 'PENDING_STORE_ORDER', unitCost: 120 },
    ]),
    vendorOrders: [],
    dailyLogs: [],
    qaRecords: [],
    dailyTargets: [],
  },
  {
    id: 'proj-003',
    projectDetails: {
      name: 'Indiranagar Penthouse',
      status: 'In Progress',
      totalSqft: 2400,
      estimatedDays: 30,
      actualDays: 10,
      startDate: '2025-07-20',
      endDate: '2025-08-20',
      totalBudget: 680000,
      totalMaterialCost: 250000,
      totalLaborCost: 220000,
      estimatedProfitMargin: 30.9,
      dailyPainterRate: 800,
    },
    customerDetails: {
      name: 'Mr. Karthik Menon',
      phone: '+91 98450 33445',
      address: '100 Feet Road, Indiranagar, Bangalore - 560038',
    },
    leadSupervisorId: 'sup-3',
    supervisors: SHARED_SUPERVISORS,
    painters: SHARED_PAINTERS.map((p, i) => ({
      ...p,
      checkedIn: i < 2,
    })),
    vendors: SHARED_VENDORS,
    floors: [
      {
        id: 'p3-gf',
        name: 'Penthouse Level',
        level: 0,
        rooms: [
          makeRoom('p3-living', 'Living Room', 420, 3),
          makeRoom('p3-kitchen', 'Kitchen', 200, 2),
          makeRoom('p3-mbr', 'Master Bedroom', 360, 2),
          makeRoom('p3-br2', 'Bedroom 2', 280, 1),
          makeRoom('p3-terrace', 'Terrace Area', 500, 0),
        ],
      },
    ],
    materialBillOfQuantities: makeMaterials([
      { name: 'WallCare Putty', category: 'Putty', brand: 'Birla White', qty: 90, unit: 'kg', vendor: 'Indiranagar Hardware - Indiranagar', ordered: 90, delivered: 90, status: 'DELIVERED_AT_SITE', unitCost: 45 },
      { name: 'Tractor Acrylic Primer', category: 'Primer', brand: 'Asian Paints', qty: 60, unit: 'L', vendor: 'Asian Paints Dealer - Indiranagar', ordered: 60, delivered: 30, status: 'ORDERED', unitCost: 180 },
      { name: 'Royal Aspira Emulsion', category: 'Emulsion', brand: 'Asian Paints', qty: 120, unit: 'L', vendor: 'Asian Paints Dealer - Indiranagar', ordered: 0, delivered: 0, status: 'PENDING_STORE_ORDER', unitCost: 520 },
      { name: 'Sandpaper Assorted', category: 'Abrasives', brand: 'Carborundum Universal', qty: 30, unit: 'sheets', vendor: 'Indiranagar Hardware - Indiranagar', ordered: 30, delivered: 30, status: 'DELIVERED_AT_SITE', unitCost: 25 },
      { name: 'Brush & Roller Set', category: 'Tools', brand: 'Purdy', qty: 12, unit: 'pcs', vendor: 'Hardware Hub - Indiranagar', ordered: 12, delivered: 0, status: 'ORDERED', unitCost: 350 },
    ]),
    vendorOrders: [],
    dailyLogs: [],
    qaRecords: [],
    dailyTargets: [],
  },
  {
    id: 'proj-004',
    projectDetails: {
      name: 'Sobha City - Thanisandra',
      status: 'In Progress',
      totalSqft: 4200,
      estimatedDays: 50,
      actualDays: 5,
      startDate: '2025-08-01',
      endDate: '2025-09-20',
      totalBudget: 1100000,
      totalMaterialCost: 420000,
      totalLaborCost: 340000,
      estimatedProfitMargin: 30.9,
      dailyPainterRate: 875,
    },
    customerDetails: {
      name: 'Mrs. Lakshmi Rao',
      phone: '+91 98450 44556',
      address: 'Sobha City, Thanisandra, Bangalore - 560077',
    },
    leadSupervisorId: 'sup-4',
    supervisors: SHARED_SUPERVISORS,
    painters: SHARED_PAINTERS.map((p, i) => ({
      ...p,
      checkedIn: i < 5,
    })),
    vendors: SHARED_VENDORS,
    floors: [
      {
        id: 'p4-gf',
        name: 'Ground Floor',
        level: 0,
        rooms: [
          makeRoom('p4-living', 'Living Room', 380, 2),
          makeRoom('p4-dining', 'Dining Room', 240, 1),
          makeRoom('p4-kitchen', 'Kitchen', 200, 1),
        ],
      },
      {
        id: 'p4-ff',
        name: 'First Floor',
        level: 1,
        rooms: [
          makeRoom('p4-mbr', 'Master Bedroom', 360, 1),
          makeRoom('p4-br2', 'Bedroom 2', 280, 0),
          makeRoom('p4-br3', 'Bedroom 3', 240, 0),
          makeRoom('p4-study', 'Study Room', 180, 0),
        ],
      },
    ],
    materialBillOfQuantities: makeMaterials([
      { name: 'WallCare Putty', category: 'Putty', brand: 'Birla White', qty: 150, unit: 'kg', vendor: 'Thanisandra Hardware - Thanisandra', ordered: 80, delivered: 40, status: 'ORDERED', unitCost: 45 },
      { name: 'Tractor Acrylic Primer', category: 'Primer', brand: 'Asian Paints', qty: 100, unit: 'L', vendor: 'Asian Paints Dealer - Thanisandra', ordered: 0, delivered: 0, status: 'PENDING_STORE_ORDER', unitCost: 180 },
      { name: 'Royal Aspira Emulsion', category: 'Emulsion', brand: 'Asian Paints', qty: 200, unit: 'L', vendor: 'Asian Paints Dealer - Thanisandra', ordered: 0, delivered: 0, status: 'PENDING_STORE_ORDER', unitCost: 520 },
      { name: 'Weathercoat Exterior', category: 'Exterior', brand: 'Berger', qty: 80, unit: 'L', vendor: 'Berger Paints Dealer - Thanisandra', ordered: 0, delivered: 0, status: 'PENDING_STORE_ORDER', unitCost: 380 },
      { name: 'Sandpaper Assorted', category: 'Abrasives', brand: 'Carborundum Universal', qty: 60, unit: 'sheets', vendor: 'Thanisandra Hardware - Thanisandra', ordered: 60, delivered: 60, status: 'DELIVERED_AT_SITE', unitCost: 25 },
    ]),
    vendorOrders: [],
    dailyLogs: [],
    qaRecords: [],
    dailyTargets: [],
  },
  {
    id: 'proj-005',
    projectDetails: {
      name: 'Jayanthi Villa - Jayanagar',
      status: 'In Progress',
      totalSqft: 3800,
      estimatedDays: 40,
      actualDays: 20,
      startDate: '2025-07-05',
      endDate: '2025-08-25',
      totalBudget: 950000,
      totalMaterialCost: 360000,
      totalLaborCost: 300000,
      estimatedProfitMargin: 30.5,
      dailyPainterRate: 850,
    },
    customerDetails: {
      name: 'Mr. Srinivas Murthy',
      phone: '+91 98450 55667',
      address: '9th Block, Jayanagar, Bangalore - 560069',
    },
    leadSupervisorId: 'sup-5',
    supervisors: SHARED_SUPERVISORS,
    painters: SHARED_PAINTERS.map((p, i) => ({
      ...p,
      checkedIn: i < 3,
    })),
    vendors: SHARED_VENDORS,
    floors: [
      {
        id: 'p5-gf',
        name: 'Ground Floor',
        level: 0,
        rooms: [
          makeRoom('p5-living', 'Living Room', 360, 6),
          makeRoom('p5-dining', 'Dining Room', 240, 5),
          makeRoom('p5-kitchen', 'Kitchen', 200, 4),
          makeRoom('p5-guest', 'Guest Bedroom', 220, 3),
        ],
      },
      {
        id: 'p5-ff',
        name: 'First Floor',
        level: 1,
        rooms: [
          makeRoom('p5-mbr', 'Master Bedroom', 340, 2),
          makeRoom('p5-br2', 'Bedroom 2', 260, 1),
          makeRoom('p5-attic', 'Attic Room', 180, 0),
        ],
      },
    ],
    materialBillOfQuantities: makeMaterials([
      { name: 'WallCare Putty', category: 'Putty', brand: 'Birla White', qty: 140, unit: 'kg', vendor: 'Jayanagar Hardware - Jayanagar', ordered: 140, delivered: 140, status: 'DELIVERED_AT_SITE', unitCost: 45 },
      { name: 'Tractor Acrylic Primer', category: 'Primer', brand: 'Asian Paints', qty: 90, unit: 'L', vendor: 'Asian Paints Dealer - Jayanagar', ordered: 90, delivered: 60, status: 'ORDERED', unitCost: 180 },
      { name: 'Royal Aspira Emulsion', category: 'Emulsion', brand: 'Asian Paints', qty: 180, unit: 'L', vendor: 'Asian Paints Dealer - Jayanagar', ordered: 90, delivered: 0, status: 'ORDERED', unitCost: 520 },
      { name: 'Sandpaper Assorted', category: 'Abrasives', brand: 'Carborundum Universal', qty: 50, unit: 'sheets', vendor: 'Jayanagar Hardware - Jayanagar', ordered: 50, delivered: 50, status: 'DELIVERED_AT_SITE', unitCost: 25 },
      { name: 'Masking Tape', category: 'Consumables', brand: 'Tesa', qty: 30, unit: 'rolls', vendor: 'Jayanagar Hardware - Jayanagar', ordered: 0, delivered: 0, status: 'PENDING_STORE_ORDER', unitCost: 120 },
      { name: 'Brush & Roller Set', category: 'Tools', brand: 'Purdy', qty: 16, unit: 'pcs', vendor: 'Hardware Hub - Jayanagar', ordered: 16, delivered: 16, status: 'DELIVERED_AT_SITE', unitCost: 350 },
    ]),
    vendorOrders: [],
    dailyLogs: [],
    qaRecords: [],
    dailyTargets: [],
  },
];

export const demoProject = demoProjects[0];
