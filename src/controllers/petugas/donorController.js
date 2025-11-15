const prisma = require('../../config/database');
const { evaluateSingleDonor, normalizeMOORA, DOMINATORS } = require('../../services/mooraService');
const { ValidationError, NotFoundError } = require('../../utils/customErrors');
const { decryptDonorData } = require('../../utils/encryption');

/**
 * Calculate detailed MOORA values from criteria values
 * @param {Array} criteriaValues - Array of criteria values with criteria info
 * @returns {Object} - Object with benefitSum, costSum, normalizedValues, weightedValues
 */
function calculateDetailedMOORA(criteriaValues) {
  let benefitSum = 0;
  let costSum = 0;
  const normalizedValues = [];
  const weightedValues = [];
  const detailedCriteriaValues = [];

  criteriaValues.forEach(cv => {
    // mappedValue is stored in normalizedValue field in database
    const mappedValue = cv.normalizedValue;

    // Normalize using MOORA formula
    const normalized = normalizeMOORA(mappedValue, cv.criteria.code);
    normalizedValues.push(normalized);

    // Calculate weighted value
    const weightedValue = cv.criteria.weight * normalized;
    weightedValues.push(weightedValue);

    // Sum benefit and cost
    if (cv.criteria.type === 'benefit') {
      benefitSum += weightedValue;
    } else if (cv.criteria.type === 'cost') {
      costSum += weightedValue;
    }

    // Add detailed criteria value
    detailedCriteriaValues.push({
      criteriaId: cv.criteria.id,
      code: cv.criteria.code,
      rawValue: cv.rawValue,
      mappedValue: mappedValue,
    });
  });

  return {
    benefitSum,
    costSum,
    normalizedValues,
    weightedValues,
    criteriaValues: detailedCriteriaValues,
  };
}

/**
 * Safely decrypt donor data. If decryption fails, return data as-is (assume plain text)
 * @param {Object} donor - Donor object with potentially encrypted fields
 * @returns {Object} - Donor object with decrypted fields
 */
function safeDecryptDonorData(donor) {
  try {
    // Try to decrypt
    const decrypted = decryptDonorData(donor);
    return decrypted;
  } catch (error) {
    console.log('Decryption failed, assuming plain text data for donor:', donor.id);
    // If decryption fails, assume data is plain text
    // Handle birthDate conversion
    let birthDate = donor.birthDate;
    if (typeof birthDate === 'string' && birthDate.length > 50) {
      // Looks like encrypted, but failed to decrypt - return as is
      birthDate = donor.birthDate;
    } else if (typeof birthDate === 'string') {
      // Plain text ISO string
      try {
        birthDate = new Date(birthDate);
      } catch {
        birthDate = donor.birthDate;
      }
    }

    return {
      id: donor.id,
      fullName: donor.fullName || '',
      birthDate: birthDate,
      gender: donor.gender,
      bloodType: donor.bloodType || '',
      phone: donor.phone || '',
      address: donor.address || '',
    };
  }
}

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

// GET /api/petugas/events/:eventId/results
exports.getEventResults = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Get event with authorization check
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventOfficers: {
          where: { userId: req.user.id },
        },
        donors: {
          include: {
            examinations: {
              include: {
                mooraCalculations: true,
                criteriaValues: {
                  include: {
                    criteria: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        weight: true,
                        type: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Check if petugas is assigned to this event (skip if admin)
    if (req.user.role !== 'admin' && event.eventOfficers.length === 0) {
      throw new ValidationError('You are not assigned to this event');
    }

    // Calculate statistics
    const totalDonors = event.donors.length;
    const donorsWithResults = event.donors.filter(
      d => d.examinations.length > 0 && d.examinations[0].mooraCalculations.length > 0
    );

    const eligibleDonors = donorsWithResults.filter(
      d => d.examinations[0].mooraCalculations[0].isEligible
    );

    // Get threshold
    const thresholdSetting = await prisma.systemSetting.findUnique({
      where: { key: 'eligibility_threshold' },
    });
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 0.0520;

    // Build evaluations list
    const evaluations = donorsWithResults.map(d => {
      const examination = d.examinations[0];
      const mooraEvaluation = examination.mooraCalculations[0];

      // Decrypt donor data (safely handles both encrypted and plain text)
      const decryptedDonor = safeDecryptDonorData({
        id: d.id,
        fullName: d.fullName,
        birthDate: d.birthDate,
        gender: d.gender,
        bloodType: d.bloodType,
      });

      // Calculate detailed MOORA values
      const mooraDetails = calculateDetailedMOORA(examination.criteriaValues);

      return {
        donor: decryptedDonor,
        examination: {
          id: examination.id,
          bloodPressureSystolic: examination.bloodPressureSystolic,
          bloodPressureDiastolic: examination.bloodPressureDiastolic,
          weight: examination.weight,
          hemoglobin: examination.hemoglobin,
          medicationFreeDays: examination.medicationFreeDays,
          age: examination.age,
          lastSleepHours: examination.lastSleepHours,
          hasDiseaseHistory: examination.hasDiseaseHistory,
        },
        evaluation: {
          examinationId: examination.id,
          donorId: d.id,
          preferenceValue: mooraEvaluation.preferenceValue,
          benefitSum: mooraDetails.benefitSum,
          costSum: mooraDetails.costSum,
          isEligible: mooraEvaluation.isEligible,
          status: mooraEvaluation.isEligible ? 'LAYAK' : 'TIDAK LAYAK',
          threshold,
          criteriaValues: mooraDetails.criteriaValues,
          normalizedValues: mooraDetails.normalizedValues,
          weightedValues: mooraDetails.weightedValues,
          calculatedAt: mooraEvaluation.calculatedAt,
        },
      };
    });

    res.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status,
        },
        statistics: {
          totalDonors,
          totalExamined: donorsWithResults.length,
          eligibleCount: eligibleDonors.length,
          notEligibleCount: donorsWithResults.length - eligibleDonors.length,
          threshold,
        },
        evaluations,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/petugas/events/:eventId/donors/:donorId/results
exports.getDonorResults = async (req, res, next) => {
  try {
    const { eventId, donorId } = req.params;

    // Get event with authorization check
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

    // Check if petugas is assigned to this event (skip if admin)
    if (req.user.role !== 'admin' && event.eventOfficers.length === 0) {
      throw new ValidationError('You are not assigned to this event');
    }

    // Get donor with full details
    const donor = await prisma.donor.findFirst({
      where: {
        id: donorId,
        eventId: eventId,
      },
      include: {
        examinations: {
          include: {
            mooraCalculations: true,
            criteriaValues: {
              include: {
                criteria: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    weight: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            location: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!donor) {
      throw new NotFoundError('Donor not found in this event');
    }

    // Check if donor has been examined
    if (donor.examinations.length === 0) {
      // Decrypt donor data (safely handles both encrypted and plain text)
      const decryptedDonor = safeDecryptDonorData({
        id: donor.id,
        fullName: donor.fullName,
        birthDate: donor.birthDate,
        gender: donor.gender,
        bloodType: donor.bloodType,
        phone: donor.phone,
        address: donor.address,
      });

      return res.json({
        success: true,
        message: 'Donor has not been examined yet',
        data: {
          donor: decryptedDonor,
          event: donor.event,
          hasExamination: false,
        },
      });
    }

    const examination = donor.examinations[0];
    const hasEvaluation = examination.mooraCalculations.length > 0;

    // Get threshold
    const thresholdSetting = await prisma.systemSetting.findUnique({
      where: { key: 'eligibility_threshold' },
    });
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 0.0520;

    // Decrypt donor data (safely handles both encrypted and plain text)
    const decryptedDonor = safeDecryptDonorData({
      id: donor.id,
      fullName: donor.fullName,
      birthDate: donor.birthDate,
      gender: donor.gender,
      bloodType: donor.bloodType,
      phone: donor.phone,
      address: donor.address,
    });

    // Calculate detailed MOORA values
    const mooraDetails = calculateDetailedMOORA(examination.criteriaValues);

    // Build response
    const response = {
      donor: decryptedDonor,
      event: donor.event,
      examination: {
        id: examination.id,
        donorId: donor.id,
        bloodPressureSystolic: examination.bloodPressureSystolic,
        bloodPressureDiastolic: examination.bloodPressureDiastolic,
        weight: examination.weight,
        hemoglobin: examination.hemoglobin,
        medicationFreeDays: examination.medicationFreeDays,
        age: examination.age,
        lastSleepHours: examination.lastSleepHours,
        hasDiseaseHistory: examination.hasDiseaseHistory,
        examinationDate: examination.examinationDate,
        examinedBy: examination.examinedBy,
        createdAt: examination.createdAt,
        updatedAt: examination.updatedAt,
      },
    };

    if (hasEvaluation) {
      const mooraEvaluation = examination.mooraCalculations[0];
      response.evaluation = {
        examinationId: examination.id,
        donorId: donor.id,
        preferenceValue: mooraEvaluation.preferenceValue,
        benefitSum: mooraDetails.benefitSum,
        costSum: mooraDetails.costSum,
        isEligible: mooraEvaluation.isEligible,
        status: mooraEvaluation.isEligible ? 'LAYAK' : 'TIDAK LAYAK',
        threshold,
        criteriaValues: mooraDetails.criteriaValues,
        normalizedValues: mooraDetails.normalizedValues,
        weightedValues: mooraDetails.weightedValues,
        calculatedAt: mooraEvaluation.calculatedAt,
      };
    } else {
      response.evaluation = null;
      response.message = 'Examination completed but MOORA evaluation not yet calculated';
    }

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};
