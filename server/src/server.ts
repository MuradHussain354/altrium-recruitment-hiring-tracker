import app from './app';
import { startScheduler } from './scheduler';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[ALTRIUM SERVER] Running on port ${PORT}`);
  console.log(`[ALTRIUM SERVER] Health Check: http://localhost:${PORT}/api/v1/health`);
  startScheduler();
});
