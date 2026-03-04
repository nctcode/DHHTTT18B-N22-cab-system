require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 4030;

app.listen(PORT, () => {
  console.log(`🔬 ML Training Service running on port ${PORT}`);
});
