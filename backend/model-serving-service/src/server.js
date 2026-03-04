require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 4010;

app.listen(PORT, () => {
  console.log(`🧠 Model Serving Service running on port ${PORT}`);
});
