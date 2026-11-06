import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB, closeDB } from '../config/db.js';
import User from '../models/User.js';
import Supplier from '../models/Supplier.js';
import Part from '../models/Part.js';
import RepairJob from '../models/RepairJob.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import StockMovement from '../models/StockMovement.js';
import { seedUsers, seedSuppliers, seedParts } from './seedData.js';

dotenv.config();

export const seedDatabase = async () => {
  try {
    console.log('[Seeder] Clearing old records...');
    await User.deleteMany();
    await Supplier.deleteMany();
    await Part.deleteMany();
    await RepairJob.deleteMany();
    await PurchaseRequest.deleteMany();
    await StockMovement.deleteMany();

    console.log('[Seeder] Creating users...');
    const users = await User.create(seedUsers);
    const adminUser = users.find((u) => u.role === 'Admin');
    const managerUser = users.find((u) => u.role === 'Inventory Manager');
    const techUser1 = users.find((u) => u.name === 'Rajesh Kumar');
    const techUser2 = users.find((u) => u.name === 'Arun Verma');

    console.log('[Seeder] Creating suppliers...');
    const suppliers = await Supplier.create(seedSuppliers);

    console.log('[Seeder] Creating parts...');
    const partsToCreate = seedParts.map((item) => {
      const sup = suppliers[item.supplierIndex];
      const partObj = { ...item, supplier: sup._id };
      delete partObj.supplierIndex;
      return partObj;
    });

    const parts = await Part.create(partsToCreate);
    const partMap = new Map(parts.map((p) => [p.sku, p]));

    console.log('[Seeder] Generating historical stock movements...');
    const movements = [];
    let movCount = 1;

    for (const part of parts) {
      if (part.totalQuantity > 0) {
        movements.push({
          movementId: `MOV-2025-${(movCount++).toString().padStart(5, '0')}`,
          part: part._id,
          partName: part.name,
          sku: part.sku,
          type: 'RECEIVED',
          quantity: part.totalQuantity,
          previousTotal: 0,
          newTotal: part.totalQuantity,
          previousReserved: 0,
          newReserved: 0,
          referenceType: 'InitialStock',
          referenceId: 'INITIAL-STOCK',
          performedBy: managerUser._id,
          performedByName: managerUser.name,
          reason: 'Initial opening inventory setup',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        });
      }
    }

    await StockMovement.create(movements);

    console.log('[Seeder] Creating repair jobs...');
    const brakePad = partMap.get('PRT-BRK-001');
    const oilFilter = partMap.get('PRT-FLT-001');
    const castrolOil = partMap.get('PRT-FLD-001');
    const dieselFilter = partMap.get('PRT-FLT-004');
    const waterPump = partMap.get('PRT-ENG-002');
    const controlArm = partMap.get('PRT-SUS-002');
    const clutchKit = partMap.get('PRT-TRN-001');
    const valveGasket = partMap.get('PRT-ENG-004');
    const sparkPlugs = partMap.get('PRT-ENG-003');
    const ledKit = partMap.get('PRT-ELE-003');
    const cabinFilter = partMap.get('PRT-FLT-003');
    const rearBrakeShoe = partMap.get('PRT-BRK-002');

    const sampleJobs = [
      {
        jobId: 'JOB-2025-0001',
        customerName: 'Aditya Deshmukh',
        customerPhone: '+91 98221 44550',
        customerEmail: 'aditya.deshmukh@gmail.com',
        vehicleDetails: { make: 'Hyundai', model: 'Creta 1.5 SX', year: 2022 },
        registrationNumber: 'MH-12-PQ-8877',
        assignedTechnician: techUser1._id,
        technicianName: techUser1.name,
        description: 'Periodic 40,000 km general service and engine oil replacement',
        priority: 'Medium',
        status: 'In Progress',
        requiredParts: [
          {
            part: oilFilter._id,
            partName: oilFilter.name,
            sku: oilFilter.sku,
            quantityRequired: 1,
            quantityReserved: 1,
            unitPrice: oilFilter.sellingPrice,
            isReserved: true,
          },
          {
            part: castrolOil._id,
            partName: castrolOil.name,
            sku: castrolOil.sku,
            quantityRequired: 1,
            quantityReserved: 1,
            unitPrice: castrolOil.sellingPrice,
            isReserved: true,
          },
        ],
        estimatedLaborCost: 1500,
        totalPartsCost: oilFilter.sellingPrice + castrolOil.sellingPrice,
        totalEstimatedCost: 1500 + oilFilter.sellingPrice + castrolOil.sellingPrice,
        expectedCompletionDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        notes: 'Customer reported slight engine noise during cold start',
        createdBy: managerUser._id,
      },
      {
        jobId: 'JOB-2025-0002',
        customerName: 'Sunil Gupta',
        customerPhone: '+91 98112 33445',
        customerEmail: 'sunil.gupta@yahoo.co.in',
        vehicleDetails: { make: 'Maruti Suzuki', model: 'Swift VXi 1.2', year: 2020 },
        registrationNumber: 'DL-08-CC-4521',
        assignedTechnician: techUser1._id,
        technicianName: techUser1.name,
        description: 'Severe brake squeal, front brake pads worn out and regular service check',
        priority: 'High',
        status: 'Waiting for Parts',
        requiredParts: [
          {
            part: brakePad._id,
            partName: brakePad.name,
            sku: brakePad.sku,
            quantityRequired: 2,
            quantityReserved: 0, // SHORTAGE: needs 2, available is 0!
            unitPrice: brakePad.sellingPrice,
            isReserved: false,
          },
          {
            part: oilFilter._id,
            partName: oilFilter.name,
            sku: oilFilter.sku,
            quantityRequired: 1,
            quantityReserved: 1,
            unitPrice: oilFilter.sellingPrice,
            isReserved: true,
          },
        ],
        estimatedLaborCost: 1200,
        totalPartsCost: brakePad.sellingPrice * 2 + oilFilter.sellingPrice,
        totalEstimatedCost: 1200 + brakePad.sellingPrice * 2 + oilFilter.sellingPrice,
        expectedCompletionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        notes: 'Waiting for Bosch ceramic brake pads replenishment to proceed with brake overhaul.',
        createdBy: managerUser._id,
      },
      {
        jobId: 'JOB-2025-0003',
        customerName: 'Manish Sharma',
        customerPhone: '+91 97665 12389',
        vehicleDetails: { make: 'Tata', model: 'Nexon XZ+ Petrol', year: 2021 },
        registrationNumber: 'MH-14-GH-9912',
        assignedTechnician: techUser2._id,
        technicianName: techUser2.name,
        description: 'AC cooling efficiency low, foul odor in cabin during blower operation',
        priority: 'Medium',
        status: 'Inspection',
        requiredParts: [
          {
            part: cabinFilter._id,
            partName: cabinFilter.name,
            sku: cabinFilter.sku,
            quantityRequired: 1,
            quantityReserved: 1,
            unitPrice: cabinFilter.sellingPrice,
            isReserved: true,
          },
        ],
        estimatedLaborCost: 800,
        totalPartsCost: cabinFilter.sellingPrice,
        totalEstimatedCost: 800 + cabinFilter.sellingPrice,
        expectedCompletionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: 'AC condenser inspection required along with filter swap',
        createdBy: managerUser._id,
      },
      {
        jobId: 'JOB-2025-0004',
        customerName: 'Rohan Mehra',
        customerPhone: '+91 99887 76655',
        vehicleDetails: { make: 'Mahindra', model: 'Scorpio-N Z8 Diesel', year: 2023 },
        registrationNumber: 'KA-01-MJ-3390',
        assignedTechnician: techUser2._id,
        technicianName: techUser2.name,
        description: 'Fuel system malfunction warning on dashboard, engine sluggish under load',
        priority: 'Urgent',
        status: 'Waiting for Parts',
        requiredParts: [
          {
            part: dieselFilter._id,
            partName: dieselFilter.name,
            sku: dieselFilter.sku,
            quantityRequired: 1,
            quantityReserved: 0, // OUT OF STOCK!
            unitPrice: dieselFilter.sellingPrice,
            isReserved: false,
          },
        ],
        estimatedLaborCost: 1800,
        totalPartsCost: dieselFilter.sellingPrice,
        totalEstimatedCost: 1800 + dieselFilter.sellingPrice,
        expectedCompletionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        notes: 'Part PRT-FLT-004 is out of stock in workshop. Purchase request required.',
        createdBy: managerUser._id,
      },
      {
        jobId: 'JOB-2025-0005',
        customerName: 'Priya Nambiar',
        customerPhone: '+91 98450 12890',
        vehicleDetails: { make: 'Honda', model: 'City 1.5 i-VTEC ZX', year: 2019 },
        registrationNumber: 'KA-05-NB-5544',
        assignedTechnician: techUser1._id,
        technicianName: techUser1.name,
        description: 'Engine misfire at idle, rough acceleration, replacing spark plugs',
        priority: 'High',
        status: 'In Progress',
        requiredParts: [
          {
            part: sparkPlugs._id,
            partName: sparkPlugs.name,
            sku: sparkPlugs.sku,
            quantityRequired: 1,
            quantityReserved: 1,
            unitPrice: sparkPlugs.sellingPrice,
            isReserved: true,
          },
        ],
        estimatedLaborCost: 900,
        totalPartsCost: sparkPlugs.sellingPrice,
        totalEstimatedCost: 900 + sparkPlugs.sellingPrice,
        expectedCompletionDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        notes: 'Ignition coil tests passed cleanly',
        createdBy: managerUser._id,
      },
      {
        jobId: 'JOB-2025-0006',
        customerName: 'Kunal Singhania',
        customerPhone: '+91 98210 65432',
        vehicleDetails: { make: 'Maruti Suzuki', model: 'Dzire ZXi', year: 2021 },
        registrationNumber: 'MH-04-ER-2311',
        assignedTechnician: techUser2._id,
        technicianName: techUser2.name,
        description: 'Clutch slippage in 2nd and 3rd gear, complete clutch overhaul',
        priority: 'Medium',
        status: 'Ready for Delivery',
        requiredParts: [
          {
            part: clutchKit._id,
            partName: clutchKit.name,
            sku: clutchKit.sku,
            quantityRequired: 1,
            quantityReserved: 1,
            unitPrice: clutchKit.sellingPrice,
            isReserved: true,
          },
        ],
        estimatedLaborCost: 2500,
        totalPartsCost: clutchKit.sellingPrice,
        totalEstimatedCost: 2500 + clutchKit.sellingPrice,
        expectedCompletionDate: new Date(),
        notes: 'Clutch bleeding complete, test drive smooth',
        createdBy: managerUser._id,
      },
      {
        jobId: 'JOB-2025-0007',
        customerName: 'Amit Saxena',
        customerPhone: '+91 97110 99882',
        vehicleDetails: { make: 'Hyundai', model: 'i20 Asta 1.2', year: 2020 },
        registrationNumber: 'DL-03-XY-9081',
        assignedTechnician: techUser1._id,
        technicianName: techUser1.name,
        description: 'Oil seepage from top engine valve cover',
        priority: 'Low',
        status: 'Completed',
        completedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        requiredParts: [
          {
            part: valveGasket._id,
            partName: valveGasket.name,
            sku: valveGasket.sku,
            quantityRequired: 1,
            quantityReserved: 0,
            unitPrice: valveGasket.sellingPrice,
            isReserved: false,
          },
        ],
        estimatedLaborCost: 750,
        totalPartsCost: valveGasket.sellingPrice,
        totalEstimatedCost: 750 + valveGasket.sellingPrice,
        notes: 'Replaced valve cover gasket and torqued to OEM specifications',
        createdBy: managerUser._id,
      },
      {
        jobId: 'JOB-2025-0008',
        customerName: 'Sanjay Reddy',
        customerPhone: '+91 99401 22334',
        vehicleDetails: { make: 'Mahindra', model: 'Thar LX 4x4', year: 2022 },
        registrationNumber: 'TS-09-TH-4444',
        assignedTechnician: techUser2._id,
        technicianName: techUser2.name,
        description: 'Engine overheating issue, coolant leak detected around water pump',
        priority: 'Urgent',
        status: 'Waiting for Parts',
        requiredParts: [
          {
            part: waterPump._id,
            partName: waterPump.name,
            sku: waterPump.sku,
            quantityRequired: 1,
            quantityReserved: 0,
            unitPrice: waterPump.sellingPrice,
            isReserved: false,
          },
        ],
        estimatedLaborCost: 2200,
        totalPartsCost: waterPump.sellingPrice,
        totalEstimatedCost: 2200 + waterPump.sellingPrice,
        expectedCompletionDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        notes: 'Customer stranded on highway, priority resolution requested',
        createdBy: managerUser._id,
      },
      {
        jobId: 'JOB-2025-0009',
        customerName: 'Gaurav Khanna',
        customerPhone: '+91 98765 43210',
        vehicleDetails: { make: 'Maruti Suzuki', model: 'Swift VDi', year: 2019 },
        registrationNumber: 'CH-01-AB-1234',
        assignedTechnician: techUser1._id,
        technicianName: techUser1.name,
        description: 'Thumping noise over potholes from front left suspension',
        priority: 'Medium',
        status: 'Waiting for Parts',
        requiredParts: [
          {
            part: controlArm._id,
            partName: controlArm.name,
            sku: controlArm.sku,
            quantityRequired: 1,
            quantityReserved: 0, // 0 available!
            unitPrice: controlArm.sellingPrice,
            isReserved: false,
          },
        ],
        estimatedLaborCost: 1100,
        totalPartsCost: controlArm.sellingPrice,
        totalEstimatedCost: 1100 + controlArm.sellingPrice,
        expectedCompletionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        notes: 'Bushing completely torn, arm replacement necessary',
        createdBy: managerUser._id,
      },
      {
        jobId: 'JOB-2025-0010',
        customerName: 'Naveen Chopra',
        customerPhone: '+91 98199 88776',
        vehicleDetails: { make: 'Tata', model: 'Altroz XZ', year: 2022 },
        registrationNumber: 'MH-01-DE-7788',
        assignedTechnician: techUser2._id,
        technicianName: techUser2.name,
        description: 'Upgrade stock halogen bulbs to high-output LED headlights',
        priority: 'Low',
        status: 'New',
        requiredParts: [
          {
            part: ledKit._id,
            partName: ledKit.name,
            sku: ledKit.sku,
            quantityRequired: 1,
            quantityReserved: 0,
            unitPrice: ledKit.sellingPrice,
            isReserved: false,
          },
        ],
        estimatedLaborCost: 500,
        totalPartsCost: ledKit.sellingPrice,
        totalEstimatedCost: 500 + ledKit.sellingPrice,
        expectedCompletionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        notes: 'Customer brought vehicle in afternoon',
        createdBy: managerUser._id,
      },
    ];

    const repairJobs = await RepairJob.create(sampleJobs);
    const job002 = repairJobs.find((j) => j.jobId === 'JOB-2025-0002');
    const job004 = repairJobs.find((j) => j.jobId === 'JOB-2025-0004');

    console.log('[Seeder] Creating purchase requests...');
    const boschSupplier = suppliers.find((s) => s.supplierId === 'SUP-001');
    const castrolSupplier = suppliers.find((s) => s.supplierId === 'SUP-004');
    const mannSupplier = suppliers.find((s) => s.supplierId === 'SUP-005');
    const lumaxSupplier = suppliers.find((s) => s.supplierId === 'SUP-003');

    const samplePRs = [
      {
        requestNumber: 'PR-2025-0001',
        supplier: boschSupplier._id,
        supplierName: boschSupplier.name,
        items: [
          {
            part: brakePad._id,
            partName: brakePad.name,
            sku: brakePad.sku,
            quantityRequested: 10,
            quantityReceived: 0,
            estimatedUnitPrice: brakePad.purchasePrice,
            totalPrice: brakePad.purchasePrice * 10,
          },
          {
            part: rearBrakeShoe._id,
            partName: rearBrakeShoe.name,
            sku: rearBrakeShoe.sku,
            quantityRequested: 5,
            quantityReceived: 0,
            estimatedUnitPrice: rearBrakeShoe.purchasePrice,
            totalPrice: rearBrakeShoe.purchasePrice * 5,
          },
        ],
        totalEstimatedCost: brakePad.purchasePrice * 10 + rearBrakeShoe.purchasePrice * 5,
        priority: 'High',
        status: 'Ordered',
        reason: 'Restocking low ceramic brake pads and shoes',
        orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        requestedBy: managerUser._id,
        requestedByName: managerUser.name,
        approvedBy: adminUser._id,
        approvedByName: adminUser.name,
        notes: 'Dispatched via BlueDart express courier, tracking #BD9827419',
      },
      {
        requestNumber: 'PR-2025-0002',
        supplier: boschSupplier._id,
        supplierName: boschSupplier.name,
        items: [
          {
            part: dieselFilter._id,
            partName: dieselFilter.name,
            sku: dieselFilter.sku,
            quantityRequested: 6,
            quantityReceived: 0,
            estimatedUnitPrice: dieselFilter.purchasePrice,
            totalPrice: dieselFilter.purchasePrice * 6,
          },
        ],
        totalEstimatedCost: dieselFilter.purchasePrice * 6,
        priority: 'Urgent',
        status: 'Approved',
        reason: `Urgent stock shortage for Job ${job004.jobId}`,
        linkedRepairJob: job004._id,
        linkedJobId: job004.jobId,
        expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        requestedBy: managerUser._id,
        requestedByName: managerUser.name,
        approvedBy: adminUser._id,
        approvedByName: adminUser.name,
        notes: 'Approved for express dispatch by Admin',
      },
      {
        requestNumber: 'PR-2025-0003',
        supplier: castrolSupplier._id,
        supplierName: castrolSupplier.name,
        items: [
          {
            part: castrolOil._id,
            partName: castrolOil.name,
            sku: castrolOil.sku,
            quantityRequested: 20,
            quantityReceived: 20,
            estimatedUnitPrice: castrolOil.purchasePrice,
            totalPrice: castrolOil.purchasePrice * 20,
          },
        ],
        totalEstimatedCost: castrolOil.purchasePrice * 20,
        priority: 'Medium',
        status: 'Received',
        receivedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        reason: 'Monthly engine oil bulk procurement',
        requestedBy: managerUser._id,
        requestedByName: managerUser.name,
        approvedBy: adminUser._id,
        approvedByName: adminUser.name,
        notes: 'All 20 cans inspected and stocked into Drum A1',
      },
      {
        requestNumber: 'PR-2025-0004',
        supplier: mannSupplier._id,
        supplierName: mannSupplier.name,
        items: [
          {
            part: oilFilter._id,
            partName: oilFilter.name,
            sku: oilFilter.sku,
            quantityRequested: 20,
            quantityReceived: 10,
            estimatedUnitPrice: oilFilter.purchasePrice,
            totalPrice: oilFilter.purchasePrice * 20,
          },
        ],
        totalEstimatedCost: oilFilter.purchasePrice * 20,
        priority: 'Medium',
        status: 'Partially Received',
        reason: 'Filter inventory replenishment',
        orderDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        expectedDeliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        requestedBy: managerUser._id,
        requestedByName: managerUser.name,
        approvedBy: adminUser._id,
        approvedByName: adminUser.name,
        notes: '10 units delivered; remaining 10 arriving tomorrow',
      },
      {
        requestNumber: 'PR-2025-0005',
        supplier: lumaxSupplier._id,
        supplierName: lumaxSupplier.name,
        items: [
          {
            part: controlArm._id,
            partName: controlArm.name,
            sku: controlArm.sku,
            quantityRequested: 5,
            quantityReceived: 0,
            estimatedUnitPrice: controlArm.purchasePrice,
            totalPrice: controlArm.purchasePrice * 5,
          },
        ],
        totalEstimatedCost: controlArm.purchasePrice * 5,
        priority: 'High',
        status: 'Pending Approval',
        reason: 'Zero available stock for control arms',
        expectedDeliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        requestedBy: managerUser._id,
        requestedByName: managerUser.name,
        notes: 'Awaiting manager approval',
      },
    ];

    await PurchaseRequest.create(samplePRs);

    console.log('[Seeder] Database seeded successfully!');
    console.log('----------------------------------------------------');
    console.log('Demo Accounts:');
    console.log('1. Admin: admin@workshopparts.com / admin123');
    console.log('2. Manager: manager@workshopparts.com / manager123');
    console.log('3. Technician: rajesh.tech@workshopparts.com / tech123');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('[Seeder] Error during seeding:', error);
    throw error;
  }
};

// If run directly from CLI
if (process.argv[1]?.endsWith('seeder.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await closeDB();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();
}
