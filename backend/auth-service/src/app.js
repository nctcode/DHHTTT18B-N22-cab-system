const express = require('express');
const app = express();

app.use(express.json());
app.use('/auth', require('./routes/auth.routes'));

module.exports = app;
