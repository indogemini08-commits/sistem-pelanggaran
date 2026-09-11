import path from 'path';
import fs from 'fs';
import express from 'express';
import app, { ensureDbInitialized } from './app';

const PORT = process.env.PORT || 5000;

// Serve frontend in standalone production if dist exists
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

async function startServer() {
  try {
    await ensureDbInitialized();

    app.listen(PORT, () => {
      console.log(`Backend Server aktif di http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Gagal menjalankan server:', err);
    process.exit(1);
  }
}

startServer();
