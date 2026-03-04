const UserService = require('../services/user.service');

exports.registerUser = async (req, res) => {
  try {
    const user = await UserService.registerUser(req.body);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updatedUser = await UserService.updateUser(req.params.id, req.body);
    return res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await UserService.deleteUser(req.params.id);
    return res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { skip, take } = req.query;
    const result = await UserService.getAllUsers(Number(skip) || 0, Number(take) || 10);
    return res.json({
      success: true,
      data: result.data,
      pagination: {
        skip: result.skip,
        take: result.take,
        total: result.total
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUserByPhone = async (req, res) => {
  try {
    const user = await UserService.getUserByPhone(req.params.phone);
    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.addUserAddress = async (req, res) => {
  try {
    const address = await UserService.addUserAddress(req.params.id, req.body);
    return res.json({
      success: true,
      message: 'Address added successfully',
      data: address
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUserAddresses = async (req, res) => {
  try {
    const addresses = await UserService.getUserAddresses(req.params.id);
    return res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};