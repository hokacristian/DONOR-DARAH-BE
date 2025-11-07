const prisma = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../utils/customErrors');
const { decryptDonorData } = require('../../utils/encryption');

// GET /api/petugas/my-events
exports.getMyEvents = async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        eventOfficers: {
          some: {
            userId: req.user.id,
          },
        },
      },
      include: {
        _count: {
          select: { donors: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/petugas/events/:id
exports.getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        eventOfficers: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        donors: {
          include: {
            examinations: {
              include: {
                sawEvaluations: true,
              },
            },
          },
        },
        _count: {
          select: { donors: true, eventOfficers: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Check if petugas is assigned to this event (skip if admin)
    if (req.user.role !== 'admin') {
      const isAssigned = event.eventOfficers.some(
        officer => officer.userId === req.user.id
      );

      if (!isAssigned) {
        throw new ValidationError('You are not assigned to this event');
      }
    }

    // Decrypt donor data
    if (event.donors && event.donors.length > 0) {
      event.donors = event.donors.map(donor => decryptDonorData(donor));
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};
