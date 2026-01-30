const service = require('../services/auth.service');
// Auth Controller for user authentication
exports.register = async (req, res) => {
  const { email, password, role } = req.body;
  const user = await service.register(email, password, role);
  res.json(user.rows[0]);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const data = await service.login(email, password);
  res.json(data);
};

exports.me = async (req, res) => {
  res.json(req.user);
};
