const db = require('../config/db');

exports.findByEmail = (email) =>
  db.query('SELECT * FROM accounts WHERE email=$1', [email]);

exports.create = (email, passwordHash, role) =>
  db.query(
    'INSERT INTO accounts(email, password_hash, role) VALUES($1,$2,$3) RETURNING *',
    [email, passwordHash, role]
  );

exports.findById = (id) =>
  db.query('SELECT id,email,role FROM accounts WHERE id=$1', [id]);
