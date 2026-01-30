const bcrypt = require('bcrypt');
// Utility functions for password hashing and comparison
exports.hash = (password) => bcrypt.hash(password, 10);
exports.compare = (password, hash) => bcrypt.compare(password, hash);
