require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`evaluAIte backend listening on http://localhost:${PORT}`);
  console.log(`  OpenAI integration: ${process.env.OPENAI_API_KEY ? 'enabled' : 'disabled (mock mode)'}`);
});
