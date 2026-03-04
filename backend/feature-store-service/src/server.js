require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4020;

app.listen(PORT, () => {
  console.log(`📦 Feature Store Service running on port ${PORT}`);
});
