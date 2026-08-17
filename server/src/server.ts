import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[ALTRIUM SERVER] Running on port ${PORT}`);
  console.log(`[ALTRIUM SERVER] Health Check: http://localhost:${PORT}/api/v1/health`);
});
