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

    // Check if petugas is assigned to any events
    if (petugas._count.eventOfficers > 0) {
      throw new ValidationError(
        `Cannot delete petugas who is assigned to ${petugas._count.eventOfficers} event(s). Please remove assignments first.`
      );
    }

    // Check if petugas has registered donors
    if (petugas._count.registeredDonors > 0) {
      throw new ValidationError(
        `Cannot delete petugas who has registered ${petugas._count.registeredDonors} donor(s).`
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Petugas deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
