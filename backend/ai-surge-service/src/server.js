require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 4003;

app.listen(PORT, () => {
  console.log(`⚡ AI Surge Service running on port ${PORT}`);
});
