import RepairJob from '../models/RepairJob.js';
import Part from '../models/Part.js';
import User from '../models/User.js';
import {
  checkPartsAvailability,
  reservePartsForJob,
  releasePartsForJob,
  issuePartsForJob,
} from '../services/inventoryService.js';

let jobCounter = 1;

const generateJobId = async () => {
  const count = await RepairJob.countDocuments();
  const nextNum = (count + jobCounter++).toString().padStart(4, '0');
  return `JOB-${new Date().getFullYear()}-${nextNum}`;
};

export const getRepairJobs = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      technicianId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Role-based filter: if user is Technician, only show jobs assigned to them
    if (req.user.role === 'Technician') {
      query.assignedTechnician = req.user._id;
    } else if (technicianId && technicianId !== 'all') {
      query.assignedTechnician = technicianId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { jobId: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { registrationNumber: searchRegex },
        { 'vehicleDetails.make': searchRegex },
        { 'vehicleDetails.model': searchRegex },
      ];
    }

    const total = await RepairJob.countDocuments(query);
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const jobs = await RepairJob.find(query)
      .populate('assignedTechnician', 'name email phone')
      .populate('requiredParts.part', 'name sku totalQuantity reservedQuantity minimumStockLevel sellingPrice')
      .sort(sortOption)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRepairJobById = async (req, res, next) => {
  try {
    const job = await RepairJob.findById(req.params.id)
      .populate('assignedTechnician', 'name email phone avatar')
      .populate('createdBy', 'name email')
      .populate('requiredParts.part');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found' });
    }

    // Role restriction check for technician
    if (req.user.role === 'Technician' && job.assignedTechnician?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this repair job' });
    }

    // Real-time stock analysis for each part
    const stockAnalysis = await Promise.all(
      job.requiredParts.map(async (item) => {
        const part = await Part.findById(item.part);
        if (!part) {
          return {
            partId: item.part,
            partName: item.partName,
            sku: item.sku,
            quantityRequired: item.quantityRequired,
            quantityReserved: item.quantityReserved || 0,
            availableInStock: 0,
            shortage: item.quantityRequired - (item.quantityReserved || 0),
            isFulfilled: false,
          };
        }

        const available = Math.max(0, part.totalQuantity - part.reservedQuantity);
        const needed = item.quantityRequired - (item.quantityReserved || 0);
        const shortage = Math.max(0, needed - available);

        return {
          partId: part._id,
          partName: part.name,
          sku: part.sku,
          brand: part.brand,
          unitPrice: item.unitPrice,
          purchasePrice: part.purchasePrice,
          supplier: part.supplier,
          storageLocation: part.storageLocation,
          quantityRequired: item.quantityRequired,
          quantityReserved: item.quantityReserved || 0,
          availableInStock: available,
          shortage,
          isFulfilled: (item.quantityReserved || 0) >= item.quantityRequired,
        };
      })
    );

    const hasShortage = stockAnalysis.some((item) => item.shortage > 0 || !item.isFulfilled);

    res.status(200).json({
      success: true,
      job,
      stockAnalysis,
      hasShortage,
    });
  } catch (error) {
    next(error);
  }
};

export const createRepairJob = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      vehicleDetails,
      registrationNumber,
      assignedTechnician,
      description,
      priority = 'Medium',
      requiredParts = [],
      estimatedLaborCost = 0,
      expectedCompletionDate,
      notes,
    } = req.body;

    if (!customerName || !customerPhone || !registrationNumber || !description) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, phone, registration number, and description are required',
      });
    }

    // Resolve technician name if technician ID given
    let technicianName = '';
    if (assignedTechnician) {
      const tech = await User.findById(assignedTechnician);
      if (tech) technicianName = tech.name;
    }

    // Process parts details
    let totalPartsCost = 0;
    const processedParts = [];

    for (const item of requiredParts) {
      const part = await Part.findById(item.partId || item.part);
      if (part) {
        const qty = Number(item.quantityRequired || item.quantity) || 1;
        const price = part.sellingPrice;
        totalPartsCost += price * qty;

        processedParts.push({
          part: part._id,
          partName: part.name,
          sku: part.sku,
          quantityRequired: qty,
          quantityReserved: 0,
          unitPrice: price,
          isReserved: false,
        });
      }
    }

    const totalEstimatedCost = totalPartsCost + (Number(estimatedLaborCost) || 0);
    const jobId = await generateJobId();

    const job = new RepairJob({
      jobId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail ? customerEmail.trim() : '',
      vehicleDetails: vehicleDetails || { make: 'Maruti Suzuki', model: 'Swift', year: 2021 },
      registrationNumber: registrationNumber.trim().toUpperCase(),
      assignedTechnician: assignedTechnician || null,
      technicianName,
      description: description.trim(),
      priority,
      status: 'New',
      requiredParts: processedParts,
      estimatedLaborCost: Number(estimatedLaborCost) || 0,
      totalPartsCost,
      totalEstimatedCost,
      expectedCompletionDate: expectedCompletionDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes,
      createdBy: req.user?._id,
    });

    await job.save();

    // Check inventory and reserve parts immediately
    if (processedParts.length > 0) {
      await reservePartsForJob(job, req.user);
    } else {
      job.status = 'In Progress';
      await job.save();
    }

    const populatedJob = await RepairJob.findById(job._id)
      .populate('assignedTechnician', 'name email phone')
      .populate('requiredParts.part');

    res.status(201).json({
      success: true,
      message: `Repair Job ${job.jobId} created successfully`,
      job: populatedJob,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRepairJob = async (req, res, next) => {
  try {
    const job = await RepairJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found' });
    }

    // Role restrictions: Technician can only update status
    if (req.user.role === 'Technician') {
      if (job.assignedTechnician?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this job' });
      }

      const { status, notes } = req.body;
      if (status) {
        // Technicians cannot mark as Completed directly without issuing or if Waiting for Parts
        if (status === 'Completed') {
          // If all parts reserved, allow completion
          await issuePartsForJob(job, req.user);
          job.status = 'Completed';
        } else {
          job.status = status;
        }
      }
      if (notes) job.notes = notes;
      await job.save();

      return res.status(200).json({ success: true, message: 'Job status updated', job });
    }

    const {
      customerName,
      customerPhone,
      customerEmail,
      vehicleDetails,
      registrationNumber,
      assignedTechnician,
      description,
      priority,
      status,
      estimatedLaborCost,
      expectedCompletionDate,
      notes,
    } = req.body;

    if (customerName) job.customerName = customerName.trim();
    if (customerPhone) job.customerPhone = customerPhone.trim();
    if (customerEmail !== undefined) job.customerEmail = customerEmail;
    if (vehicleDetails) job.vehicleDetails = vehicleDetails;
    if (registrationNumber) job.registrationNumber = registrationNumber.trim().toUpperCase();

    if (assignedTechnician) {
      job.assignedTechnician = assignedTechnician;
      const tech = await User.findById(assignedTechnician);
      if (tech) job.technicianName = tech.name;
    }

    if (description) job.description = description.trim();
    if (priority) job.priority = priority;
    if (estimatedLaborCost !== undefined) {
      job.estimatedLaborCost = Number(estimatedLaborCost);
      job.totalEstimatedCost = job.totalPartsCost + Number(estimatedLaborCost);
    }
    if (expectedCompletionDate) job.expectedCompletionDate = expectedCompletionDate;
    if (notes !== undefined) job.notes = notes;

    // Handle status transitions
    if (status && status !== job.status) {
      if (status === 'Cancelled') {
        await releasePartsForJob(job, req.user, 'Job cancelled');
        job.status = 'Cancelled';
      } else if (status === 'Completed') {
        await issuePartsForJob(job, req.user);
        job.status = 'Completed';
      } else {
        job.status = status;
      }
    }

    await job.save();

    const updatedJob = await RepairJob.findById(job._id)
      .populate('assignedTechnician', 'name email phone')
      .populate('requiredParts.part');

    res.status(200).json({
      success: true,
      message: 'Repair job updated successfully',
      job: updatedJob,
    });
  } catch (error) {
    next(error);
  }
};

export const recheckAndReserveJobParts = async (req, res, next) => {
  try {
    const job = await RepairJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found' });
    }

    if (job.status === 'Completed' || job.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot reserve parts for a ${job.status.toLowerCase()} job`,
      });
    }

    const { anyShortage } = await reservePartsForJob(job, req.user);

    const populatedJob = await RepairJob.findById(job._id)
      .populate('assignedTechnician', 'name email phone')
      .populate('requiredParts.part');

    res.status(200).json({
      success: true,
      message: anyShortage
        ? 'Some parts are still short. Job remains in Waiting for Parts status.'
        : 'All required parts successfully reserved! Job is now In Progress.',
      job: populatedJob,
      isFullyReserved: !anyShortage,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelJob = async (req, res, next) => {
  try {
    const job = await RepairJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found' });
    }

    if (job.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed jobs cannot be cancelled (parts already issued).',
      });
    }

    await releasePartsForJob(job, req.user, 'Repair job cancelled');
    job.status = 'Cancelled';
    await job.save();

    res.status(200).json({
      success: true,
      message: `Job ${job.jobId} cancelled and reserved parts released to inventory`,
      job,
    });
  } catch (error) {
    next(error);
  }
};
