const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { ValidationError, NotFoundError } = require('../../utils/customErrors');

// GET /api/admin/petugas
exports.getAllPetugas = async (req, res, next) => {
  try {
    const petugas = await prisma.user.findMany({
      where: { role: 'petugas' },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            eventOfficers: true,
            registeredDonors: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: petugas,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/petugas/:id
exports.getPetugasById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const petugas = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        eventOfficers: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        _count: {
          select: {
            eventOfficers: true,
            registeredDonors: true,
            examinedDonors: true,
          },
        },
      },
    });

    if (!petugas) {
      throw new NotFoundError('Petugas not found');
    }

    if (petugas.role !== 'petugas') {
      throw new ValidationError('User is not a petugas');
    }

    res.json({
      success: true,
      data: petugas,
    });
  } catch (error) {
    next(error);
  }
};

// Validation rules
exports.updatePetugasValidation = [
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// PUT /api/admin/petugas/:id
exports.updatePetugas = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(e => e.msg).join(', '));
    }

    const { id } = req.params;
    const { email, fullName, password } = req.body;

    // Check if petugas exists
    const existingPetugas = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingPetugas) {
      throw new NotFoundError('Petugas not found');
    }

    if (existingPetugas.role !== 'petugas') {
      throw new ValidationError('User is not a petugas');
    }

    // Check if email already exists (if updating email)
    if (email && email !== existingPetugas.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new ValidationError('Email already in use');
      }
    }

    // Prepare update data
    const updateData = {};
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const petugas = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Petugas updated successfully',
      data: petugas,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/petugas/:id
exports.deletePetugas = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if petugas exists
    const petugas = await prisma.user.findUnique({
      where: { id },
      include: {
        eventOfficers: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            eventOfficers: true,
            registeredDonors: true,
          },
        },
      },
    });

    if (!petugas) {
      throw new NotFoundError('Petugas not found');
    }

    if (petugas.role !== 'petugas') {
      throw new ValidationError('User is not a petugas');
    }

    // Check if petugas has registered donors
    if (petugas._count.registeredDonors > 0) {
      throw new ValidationError(
        `Cannot delete petugas who has registered ${petugas._count.registeredDonors} donor(s).`
      );
    }

    // Check if petugas is assigned to active or draft events
    const activeAssignments = petugas.eventOfficers.filter(
      eo => eo.event.status === 'active' || eo.event.status === 'draft'
    );

    if (activeAssignments.length > 0) {
      const eventNames = activeAssignments.map(eo => eo.event.name).join(', ');
      throw new ValidationError(
        `Cannot delete petugas who is assigned to ${activeAssignments.length} active/draft event(s): ${eventNames}. Please remove assignments first.`
      );
    }

    // Auto-remove from completed events
    const completedAssignments = petugas.eventOfficers.filter(
      eo => eo.event.status === 'completed'
    );

    if (completedAssignments.length > 0) {
      console.log(`[deletePetugas] Auto-removing petugas from ${completedAssignments.length} completed event(s)`);
      await prisma.eventOfficer.deleteMany({
        where: {
          userId: id,
          event: {
            status: 'completed',
          },
        },
      });
    }

    // Delete petugas
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: completedAssignments.length > 0
        ? `Petugas deleted successfully (auto-removed from ${completedAssignments.length} completed event(s))`
        : 'Petugas deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
