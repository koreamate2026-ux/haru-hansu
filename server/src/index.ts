import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { householdsRouter } from './routes/households.js';
import { personsRouter } from './routes/persons.js';

const app = express();
const PORT = Number(process.env.PORT ?? 8095);
const ORIGIN = process.env.CORS_ORIGIN ?? '*';

app.use(cors({ origin: ORIGIN }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'haru-hansu-api', time: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/households', householdsRouter);
app.use('/api/households/:householdId/persons', personsRouter);

app.use((_req, res) => res.status(404).json({ error: 'not found' }));

app.listen(PORT, () => {
  console.log(`haru-hansu-api listening on :${PORT}`);
});
