const jwt = require("jsonwebtoken");
const User = require("../models/User");

const adminMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and has admin role
    const user = await User.findById(decoded.userId || decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    // Attach user to request
    req.user = { userId: user._id, email: user.email, name: user.name, role: user.role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid token." });
  }
};

module.exports = adminMiddleware;
