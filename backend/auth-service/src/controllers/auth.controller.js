const service = require('../services/auth.service');

// Auth Controller for user authentication
exports.register = async (req, res) => {
  try {
    const { password, fullName, phone, email, role } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: "Email, password, fullName, and phone are required"
      });
    }

    // Call auth service to handle registration
    const result = await service.register({
      password,
      fullName,
      phone,
      email,
      role: role || 'PASSENGER'
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result.data,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (err) {
    console.error("Register error:", err);

    // Duplicate entry (User Service or Auth DB)
    if (err.code === '23505' || err.status === 409 || err.code === 'USER_EXISTS') {
      return res.status(409).json({
        success: false,
        message: err.message || "Email or phone already exists"
      });
    }

    // User service unavailable
    if (err.code === 'ECONNREFUSED' || err.code === 'SERVICE_UNAVAILABLE' || err.status === 503) {
      return res.status(503).json({
        success: false,
        message: "User service temporarily unavailable"
      });
    }

    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error"
    });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Call service with email
    const data = await service.login(email, password);

    return res.json({
      success: true,
      message: "Login successful",
      data: data.data,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken
    });
  } catch (err) {
    console.error("Login error:", err);

    return res.status(err.status || 401).json({
      success: false,
      message: err.message || "Invalid email or password"
    });
  }
};

exports.me = async (req, res) => {
  try {
    return res.json(req.user);
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
exports.deactivateAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    await service.deactivateAccount(userId);
    return res.json({ success: true, message: "Account deactivated" });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error"
    });
  }
};
