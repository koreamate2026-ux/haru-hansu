import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { householdsRouter } from './routes/households.js';
import { personsRouter } from './routes/persons.js';

const app = express();
const PORT = Number(process.env.PORT ?? 8095);

// CORS_ORIGIN: 쉼표로 구분된 허용 origin 목록. "*"이면 전부 허용(개발용).
// 값 하나가 *.vercel.app이면 그 프로젝트의 프리뷰 배포(브랜치마다 주소가 달라짐)도 전부 허용한다.
const ORIGINS = (process.env.CORS_ORIGIN ?? '*').split(',').map((s) => s.trim());
const corsOrigin: cors.CorsOptions['origin'] =
  ORIGINS.includes('*')
    ? true
    : (origin, cb) => {
        if (!origin) return cb(null, true); // 서버 대 서버 호출 등 origin이 없는 요청
        const ok = ORIGINS.some((allowed) => {
          if (allowed.startsWith('*.')) return origin.endsWith(allowed.slice(1));
          return origin === allowed;
        });
        cb(ok ? null : new Error('CORS로 막힌 요청이에요.'), ok);
      };

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'haru-hansu-api', time: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/households', householdsRouter);
app.use('/api/households/:householdId/persons', personsRouter);

app.use((_req, res) => res.status(404).json({ error: 'not found' }));

app.listen(PORT, () => {
  console.log(`haru-hansu-api listening on :${PORT}`);
});
