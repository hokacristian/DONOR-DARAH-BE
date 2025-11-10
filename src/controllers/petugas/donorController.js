const prisma = require('../../config/database');
const { evaluateSingleDonor } = require('../../services/mooraService');
const { ValidationError, NotFoundError } = require('../../utils/customErrors');

exports.createDonorWithExamination = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const {
      // Donor biodata
      fullName,
      birthDate,
      gender,
      bloodType,
      phone,
      address,
      // Examination data
      bloodPressureSystolic,
      bloodPressureDiastolic,
      weight,
      hemoglobin,
      medicationFreeDays,
      age,
      lastSleepHours,
      hasDiseaseHistory,
    } = req.body;

    // Validate event exists and is active
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventOfficers: {
          where: { userId: req.user.id },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.status === 'completed') {
      throw new ValidationError('Cannot add donors to completed event');
    }

    // Check if petugas is assigned to this event (skip if admin)
    if (req.user.role !== 'admin' && event.eventOfficers.length === 0) {
      throw new ValidationError('You are not assigned to this event');
    }

    // Create donor and examination in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create donor
      const donor = await tx.donor.create({
        data: {
          eventId,
          fullName,
          birthDate: new Date(birthDate),
          gender,
          bloodType,
          phone,
          address,
          registeredBy: req.user.id,
        },
      });

      // Create examination
      const examination = await tx.donorExamination.create({
        data: {
          donorId: donor.id,
          bloodPressureSystolic: parseInt(bloodPressureSystolic),
          bloodPressureDiastolic: parseInt(bloodPressureDiastolic),
          weight: parseFloat(weight),
          hemoglobin: parseFloat(hemoglobin),
          medicationFreeDays: parseInt(medicationFreeDays),
          age: parseInt(age),
          lastSleepHours: parseFloat(lastSleepHours),
          hasDiseaseHistory: hasDiseaseHistory === true || hasDiseaseHistory === 'true',
          examinedBy: req.user.id,
        },
      });

      return { donor, examination };
    });

    // Trigger MOORA evaluation
    const mooraResult = await evaluateSingleDonor(result.examination.id);

    res.status(201).json({
      success: true,
      message: 'Donor registered and examined successfully',
      data: {
        donor: result.donor,
        examination: result.examination,
        evaluation: mooraResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getDonorsByEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const donors = await prisma.donor.findMany({
      where: { eventId },
      include: {
        examinations: {
          include: {
            mooraCalculations: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: donors,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDonorById = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    next(error);
  }
};

exports.updateDonorWithExamination = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    next(error);
  }
};
