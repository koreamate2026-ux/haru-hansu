import Anthropic from '@anthropic-ai/sdk';
import { Router } from 'express';
import { premiumOf } from '../lib/billing.js';
import { AI_MODEL, AiRefusedError, DAILY_LIMIT, aiEnabled, cacheKeyOf, generatePair, pairFactsSchema } from '../lib/ai.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { roleOf } from './households.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.get('/status', (_req, res) => res.json({ enabled: aiEnabled() }));

/** 두 사람 AI 풀이: 저장된 게 있으면 그대로, 없으면 만들어 저장한다(플러스 전용, 하루 생성 횟수 제한) */
aiRouter.post('/pair', async (req, res) => {
  if (!aiEnabled()) return res.status(503).json({ error: 'AI 풀이는 아직 준비 중이에요.', code: 'AI_DISABLED' });
  const me = req.accountId!;
  const householdId = String(req.body?.householdId ?? '');
  if (!(await roleOf(householdId, me))) return res.status(404).json({ error: '가족 그룹을 찾을 수 없어요.' });
  if (!(await premiumOf(me))) return res.status(403).json({ error: '하루 한수 플러스 기능이에요.', code: 'PLUS_ONLY' });

  const parsed = pairFactsSchema.safeParse(req.body?.facts);
  if (!parsed.success) return res.status(400).json({ error: '풀이 정보를 확인해 주세요.' });
  const key = cacheKeyOf(parsed.data);

  const saved = await prisma.aiInterpretation.findUnique({ where: { cacheKey: key } });
  if (saved) return res.json({ content: saved.content, cached: true });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiInterpretation.count({ where: { accountId: me, createdAt: { gte: since } } });
  if (used >= DAILY_LIMIT) return res.status(429).json({ error: `AI 풀이는 하루 ${DAILY_LIMIT}번까지 새로 만들 수 있어요. 내일 다시 시도해 주세요.`, code: 'AI_LIMIT' });

  try {
    const content = await generatePair(parsed.data);
    await prisma.aiInterpretation.upsert({
      where: { cacheKey: key },
      create: { cacheKey: key, accountId: me, householdId, model: AI_MODEL, content },
      update: {},
    });
    res.json({ content, cached: false });
  } catch (e) {
    if (e instanceof AiRefusedError) return res.status(422).json({ error: '이 조합은 AI 풀이를 만들 수 없어요. 기본 풀이를 봐 주세요.', code: 'AI_REFUSED' });
    if (e instanceof Anthropic.RateLimitError) return res.status(503).json({ error: '지금 AI 풀이가 몰려 있어요. 잠시 뒤 다시 시도해 주세요.' });
    if (e instanceof Anthropic.APIError) {
      console.error('[ai] API 오류', e.status, e.message);
      return res.status(502).json({ error: 'AI 풀이를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.' });
    }
    console.error('[ai] 실패', e);
    res.status(500).json({ error: 'AI 풀이를 만들지 못했어요.' });
  }
});
