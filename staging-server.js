const express = require('express');
const path = require('path');

// Temp staging server that serves both frontend and backend
const app = express();
const PORT = process.env.PORT || 3002;

// Serve static frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Proxy API calls to backend (will start separately)
const { createProxyMiddleware } = require('http-proxy-middleware');

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Staging server running on http://localhost:${PORT}`);
  console.log(`📁 Serving frontend from: frontend/dist/`);
  console.log(`🔧 Backend should run on port 3001 for API calls\n`);
});
