require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
  console.log(`⏱️  AI ETA Service running on port ${PORT}`);
});
