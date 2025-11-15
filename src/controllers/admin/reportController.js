const prisma = require('../../config/database');
const { ValidationError, NotFoundError } = require('../../utils/customErrors');
const { decryptDonorData } = require('../../utils/encryption');
const { normalizeMOORA } = require('../../services/mooraService');

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

// GET /api/admin/settings
exports.getAllSettings = async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      include: {
        updater: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/settings/:key
exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!value) {
      throw new ValidationError('Value is required');
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundError('Setting not found');
    }

    // Validate threshold value if updating eligibility_threshold
    if (key === 'eligibility_threshold') {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 1) {
        throw new ValidationError('Threshold must be a number between 0 and 1');
      }
    }

    const updated = await prisma.systemSetting.update({
      where: { key },
      data: {
        value: value.toString(),
        updatedBy: req.user.id,
      },
      include: {
        updater: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports
exports.getAllReports = async (req, res, next) => {
  try {
    // Get all events with donor count and evaluation statistics
    const events = await prisma.event.findMany({
      include: {
        donors: {
          include: {
            examinations: {
              include: {
                mooraCalculations: true,
              },
            },
          },
        },
        _count: {
          select: { donors: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform events to include statistics
    const eventReports = events.map(event => {
      const totalDonors = event.donors.length;
      const donorsWithResults = event.donors.filter(
        d => d.examinations.length > 0 && d.examinations[0].mooraCalculations.length > 0
      );
      const eligibleDonors = donorsWithResults.filter(
        d => d.examinations[0].mooraCalculations[0].isEligible
      );

      return {
        id: event.id,
        name: event.name,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        statistics: {
          totalDonors,
          totalExamined: donorsWithResults.length,
          eligibleCount: eligibleDonors.length,
          notEligibleCount: donorsWithResults.length - eligibleDonors.length,
        },
      };
    });

    res.json({
      success: true,
      data: eventReports,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports/:eventId
exports.getEventReport = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Get event with all donors and their MOORA evaluation results
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        donors: {
          include: {
            examinations: {
              include: {
                mooraCalculations: true,
                criteriaValues: {
                  include: {
                    criteria: {
                      select: {
                        code: true,
                        name: true,
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

    // Build evaluations list (no ranking, just LAYAK/TIDAK LAYAK status)
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

// GET /api/admin/dashboard/statistics
exports.getDashboardStatistics = async (req, res, next) => {
  try {
    const [
      totalEvents,
      activeEvents,
      totalPetugas,
      totalDonors,
      totalExaminations,
      eligibleDonors,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { role: 'petugas' } }),
      prisma.donor.count(),
      prisma.donorExamination.count(),
      prisma.mooraCalculation.count({ where: { isEligible: true } }),
    ]);

    // Get recent events
    const recentEvents = await prisma.event.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { donors: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        statistics: {
          totalEvents,
          activeEvents,
          totalPetugas,
          totalDonors,
          totalExaminations,
          eligibleDonors,
          notEligibleDonors: totalExaminations - eligibleDonors,
        },
        recentEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};
