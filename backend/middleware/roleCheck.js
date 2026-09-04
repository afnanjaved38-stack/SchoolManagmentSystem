module.exports = function(roles) {
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ msg: 'Authorization denied' });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        msg: `Access denied. Authorized roles: ${allowedRoles.join(', ')}` 
      });
    }
    
    next();
  };
};
