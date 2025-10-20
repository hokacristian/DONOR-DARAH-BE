const prisma = require('../../config/database');

exports.getAllCriteria = async (req, res, next) => {
  try {
    const criteria = await prisma.criteria.findMany({
      include: {
        subCriteria: true,
      },
      orderBy: { code: 'asc' },
    });

    res.json({
      success: true,
      data: criteria,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCriteriaById = async (req, res, next) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    next(error);
  }
};

exports.createCriteria = async (req, res, next) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    next(error);
  }
};

exports.updateCriteria = async (req, res, next) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    next(error);
  }
};

exports.deleteCriteria = async (req, res, next) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    next(error);
  }
};

exports.getAllSubCriteria = async (req, res, next) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    next(error);
  }
};

exports.createSubCriteria = async (req, res, next) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    next(error);
  }
};

exports.updateSubCriteria = async (req, res, next) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    next(error);
  }
};

exports.deleteSubCriteria = async (req, res, next) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    next(error);
  }
};
