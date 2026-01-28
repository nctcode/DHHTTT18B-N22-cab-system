const jwt = require('jsonwebtoken');
const model = require('../models/auth.model');
const passwordUtil = require('../utils/password');
const jwtConfig = require('../config/jwt');

exports.register = async (email, password, role) => {
  const hashed = await passwordUtil.hash(password);
  return model.create(email, hashed, role);
};

exports.login = async (email, password) => {
  const result = await model.findByEmail(email);
  if (!result.rows.length) throw new Error('Invalid credentials');

  const user = result.rows[0];
  const ok = await passwordUtil.compare(password, user.password_hash);
  if (!ok) throw new Error('Invalid credentials');

  const token = jwt.sign(
    { id: user.id, role: user.role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );

  return { token };
};
