const prisma = require('../../config/database');
const { ValidationError, NotFoundError } = require('../../utils/customErrors');

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
    const reports = await prisma.calculationHistory.findMany({
      include: {
        event: {
          select: {
            id: true,
            name: true,
            location: true,
            startDate: true,
            endDate: true,
          },
        },
        generator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports/:eventId
exports.getEventReport = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Get event with all donors and their MOORA results
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
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 0.309;

    // Build ranking list
    const rankings = donorsWithResults
      .map(d => ({
        donor: {
          id: d.id,
          fullName: d.fullName,
          birthDate: d.birthDate,
          gender: d.gender,
          bloodType: d.bloodType,
        },
        examination: {
          bloodPressureSystolic: d.examinations[0].bloodPressureSystolic,
          bloodPressureDiastolic: d.examinations[0].bloodPressureDiastolic,
          weight: d.examinations[0].weight,
          hemoglobin: d.examinations[0].hemoglobin,
          medicationFreeDays: d.examinations[0].medicationFreeDays,
          age: d.examinations[0].age,
          lastSleepHours: d.examinations[0].lastSleepHours,
          hasDiseaseHistory: d.examinations[0].hasDiseaseHistory,
        },
        mooraResult: d.examinations[0].mooraCalculations[0],
        criteriaValues: d.examinations[0].criteriaValues,
      }))
      .sort((a, b) => a.mooraResult.rank - b.mooraResult.rank);

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
        rankings,
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
