const { AuthorizationError } = require('../utils/customErrors');

const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }

      if (allowedRoles.length === 0 || allowedRoles.includes(req.user.role)) {
        next();
      } else {
        throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }
    } catch (error) {
      next(error);
    }
  };
};

module.exports = authorize;
