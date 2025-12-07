const prisma = require('../../config/database');
const { body, validationResult } = require('express-validator');
const { ValidationError, NotFoundError } = require('../../utils/customErrors');

// Validation rules
exports.createEventValidation = [
  body('name').notEmpty().withMessage('Event name is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('startDate').isISO8601().withMessage('Start date must be valid ISO 8601 date'),
  body('endDate').isISO8601().withMessage('End date must be valid ISO 8601 date'),
  body('status').optional().isIn(['draft', 'active', 'completed']).withMessage('Invalid status'),
  body('description').optional(),
];

exports.updateEventValidation = [
  body('name').optional().notEmpty().withMessage('Event name cannot be empty'),
  body('location').optional().notEmpty().withMessage('Location cannot be empty'),
  body('startDate').optional().isISO8601().withMessage('Start date must be valid ISO 8601 date'),
  body('endDate').optional().isISO8601().withMessage('End date must be valid ISO 8601 date'),
  body('description').optional(),
];

// GET /api/admin/events
exports.getAllEvents = async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: { donors: true, eventOfficers: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/events/:id
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
            assigner: {
              select: { id: true, fullName: true },
            },
          },
        },
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
          select: { donors: true, eventOfficers: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/events
exports.createEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(e => e.msg).join(', '));
    }

    const { name, location, startDate, endDate, status, description } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new ValidationError('End date must be after start date');
    }

    const event = await prisma.event.create({
      data: {
        name,
        location,
        startDate: start,
        endDate: end,
        status: status || 'draft',
        description,
        createdBy: req.user.id,
      },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/events/:id
exports.updateEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(e => e.msg).join(', '));
    }

    const { id } = req.params;
    const { name, location, startDate, endDate, description } = req.body;

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundError('Event not found');
    }

    // Validate dates if provided
    const updateData = {};
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (description !== undefined) updateData.description = description;

    if (startDate) {
      updateData.startDate = new Date(startDate);
    }
    if (endDate) {
      updateData.endDate = new Date(endDate);
    }

    // Validate date range if both dates are being updated
    if (updateData.startDate && updateData.endDate) {
      if (updateData.startDate >= updateData.endDate) {
        throw new ValidationError('End date must be after start date');
      }
    }

    // Check for officer conflicts if date is being changed
    if (updateData.startDate || updateData.endDate) {
      const newStartDate = updateData.startDate || existingEvent.startDate;
      const newEndDate = updateData.endDate || existingEvent.endDate;

      // Get all officers assigned to this event
      const assignedOfficers = await prisma.eventOfficer.findMany({
        where: { eventId: id },
        select: { userId: true },
      });

      // Check each officer for conflicts with other events
      for (const officer of assignedOfficers) {
        const officerEvents = await prisma.eventOfficer.findMany({
          where: {
            userId: officer.userId,
            eventId: { not: id }, // Exclude current event
          },
          include: {
            event: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        });

        // Check for date overlap with existing assignments
        for (const assignment of officerEvents) {
          const existingEvent = assignment.event;

          // Check if dates overlap: newStart <= existingEvent.end AND existingEvent.start <= newEnd
          if (newStartDate <= existingEvent.endDate && existingEvent.startDate <= newEndDate) {
            const officerInfo = await prisma.user.findUnique({
              where: { id: officer.userId },
              select: { fullName: true },
            });

            throw new ValidationError(
              `Officer "${officerInfo.fullName}" is already assigned to event "${existingEvent.name}" ` +
              `(${existingEvent.startDate.toISOString().split('T')[0]} - ${existingEvent.endDate.toISOString().split('T')[0]}) ` +
              `which overlaps with the new date. Please remove the officer first or change the date.`
            );
          }
        }
      }
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/events/:id
exports.deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { donors: true, eventOfficers: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // If event is NOT completed, check for donors (prevent deletion)
    if (event.status !== 'completed') {
      if (event._count.donors > 0) {
        throw new ValidationError(
          `Cannot delete event with ${event._count.donors} donors. Please remove all donors first or set event status to completed.`
        );
      }
    }

    // Event with status "completed" can always be deleted (regardless of donors)
    // This allows cleanup of completed events

    await prisma.event.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/events/:id/status
exports.updateEventStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'active', 'completed'].includes(status)) {
      throw new ValidationError('Status must be one of: draft, active, completed');
    }

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Allow all status transitions (admin has full control)
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      message: `Event status updated to ${status}`,
      data: updatedEvent,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/events/:id/officers
exports.getEventOfficers = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const officers = await prisma.eventOfficer.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
        assigner: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    res.json({
      success: true,
      data: officers,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/events/:id/officers
exports.assignOfficer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      throw new ValidationError('userId is required');
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Check if user exists and is petugas
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role !== 'petugas') {
      throw new ValidationError('Only petugas can be assigned to events');
    }

    // Check if already assigned
    const existing = await prisma.eventOfficer.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId: userId,
        },
      },
    });

    if (existing) {
      throw new ValidationError('Officer already assigned to this event');
    }

    // Check if officer is assigned to another event on the same date(s)
    const officerEvents = await prisma.eventOfficer.findMany({
      where: { userId: userId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    // Check for date overlap with existing assignments
    for (const assignment of officerEvents) {
      const existingEvent = assignment.event;

      // Check if dates overlap: event.start <= existingEvent.end AND existingEvent.start <= event.end
      if (event.startDate <= existingEvent.endDate && existingEvent.startDate <= event.endDate) {
        throw new ValidationError(
          `Officer is already assigned to event "${existingEvent.name}" ` +
          `(${existingEvent.startDate.toISOString().split('T')[0]} - ${existingEvent.endDate.toISOString().split('T')[0]}) ` +
          `which overlaps with this event's date`
        );
      }
    }

    const assignment = await prisma.eventOfficer.create({
      data: {
        eventId: id,
        userId: userId,
        assignedBy: req.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
        assigner: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Officer assigned to event successfully',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/events/:eventId/officers/:officerId
exports.removeOfficer = async (req, res, next) => {
  try {
    const { eventId, officerId } = req.params;

    // Check if assignment exists
    const assignment = await prisma.eventOfficer.findUnique({
      where: {
        eventId_userId: {
          eventId: eventId,
          userId: officerId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundError('Officer assignment not found');
    }

    await prisma.eventOfficer.delete({
      where: {
        eventId_userId: {
          eventId: eventId,
          userId: officerId,
        },
      },
    });

    res.json({
      success: true,
      message: 'Officer removed from event successfully',
    });
  } catch (error) {
    next(error);
  }
};
