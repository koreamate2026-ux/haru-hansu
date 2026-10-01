import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LottoBall } from '../components/LottoBall';
import { NumberPicker } from '../components/NumberPicker';
import { Body, Button, Screen } from '../components/ui';
import { DREAMS, type DreamKey, type LuckyCategory } from '../lib/luckyNumbers';
import { MAX_DAILY_PICKS, WEEKLY_SETS_PLUS, randomPick, useWeeklyPicks, useTodayCategories } from '../lib/todayNumbers';
import { useBilling } from '../state/BillingState';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthState';

type Step =
  | { kind: 'ask' }
  | { kind: 'category'; key: string }
  | { kind: 'random'; n: number; from: LuckyCategory | null }
  | { kind: 'manual' };

export default function AddNumber() {
  const navigate = useNavigate();
  const { account } = useAuth();
  const { todayDream, setTodayDream } = useApp();
  const { categories } = useTodayCategories();
  const { picks, add, round, set, canStartNew } = useWeeklyPicks();
  const { premium } = useBilling();
  const [step, setStep] = useState<Step>({ kind: 'ask' });
  const [manual, setManual] = useState<number | null>(null);

  if (!account) return <Navigate to="/login" replace />;
  if (!categories) return <Navigate to="/" replace />;

  const full = picks.length >= MAX_DAILY_PICKS;
  const goHome = () => navigate('/', { replace: true });
  const back = () => (step.kind === 'ask' ? goHome() : setStep({ kind: 'ask' }));
  const put = (n: number) => {
    add(n);
    goHome();
  };

  const header = (
    <header className="header">
      <button type="button" className="icon-btn" onClick={back} aria-label="뒤로">
        ‹
      </button>
      <h1>숫자 추가하기</h1>
      <span className="dim small" style={{ paddingRight: 8 }}>
        {picks.length}/{MAX_DAILY_PICKS}
      </span>
    </header>
  );

  if (full) {
    return (
      <>
        {header}
        <Screen>
          <h2 className="title" style={{ fontSize: 24, lineHeight: '34px' }}>
            이번 주 번호를 다 모았어요
          </h2>
          <Body dim style={{ margin: '8px 0 24px' }}>
            {canStartNew
              ? '홈에서 번호함에 저장하고, 새 번호를 받으려면 홈의 "새 번호 받기"를 눌러 주세요.'
              : premium
                ? `이번 주 추천 ${WEEKLY_SETS_PLUS}번을 모두 받았어요. 토요일 추첨이 끝나면 새로 받을 수 있어요.`
                : `이번 주 추천을 받았어요. 토요일 추첨이 끝나면 새로 받을 수 있고, 하루 한수 플러스는 1주일에 ${WEEKLY_SETS_PLUS}번까지 받을 수 있어요.`}
          </Body>
          <Button label="홈으로" onPress={goHome} />
        </Screen>
      </>
    );
  }

  if (step.kind === 'ask') {
    return (
      <>
        {header}
        <Screen>
          <h2 className="title" style={{ fontSize: 24, lineHeight: '34px' }}>
            어떤 숫자를 추가할까요?
          </h2>
          <Body dim style={{ margin: '8px 0 20px' }}>
            하나를 고르면 그 숫자가 홈의 오늘의 숫자에 담겨요.
          </Body>

          <div className="choices" role="list">
            <button
              type="button"
              className="choice"
              onClick={() => setStep({ kind: 'random', ...randomPick(categories, picks, `${round}|${set}|${account.id}`) })}
            >
              <span className="choice-emoji" aria-hidden>
                🎲
              </span>
              <span className="choice-main">
                <span className="choice-title">아무거나 골라 주세요</span>
                <span className="choice-tag">오늘의 행운 숫자 중 하나를 무작위로</span>
              </span>
              <span className="choice-arrow" aria-hidden>
                ›
              </span>
            </button>

            {categories.map((c) => {
              const taken = !c.empty && picks.includes(c.nums[0]);
              return (
                <button
                  key={c.key}
                  type="button"
                  className="choice"
                  disabled={c.empty || taken}
                  onClick={() => setStep({ kind: 'category', key: c.key })}
                >
                  <span className="choice-emoji" aria-hidden>
                    {c.emoji}
                  </span>
                  <span className="choice-main">
                    <span className="choice-title">{c.title}</span>
                    <span className="choice-tag">{c.tag}</span>
                  </span>
                  {c.empty ? (
                    <span className="choice-hint">정보 필요</span>
                  ) : taken ? (
                    <span className="choice-hint">이미 담았어요</span>
                  ) : (
                    <span className="choice-arrow" aria-hidden>
                      ›
                    </span>
                  )}
                </button>
              );
            })}

            <button type="button" className="choice" onClick={() => setStep({ kind: 'manual' })}>
              <span className="choice-emoji" aria-hidden>
                🔢
              </span>
              <span className="choice-main">
                <span className="choice-title">직접 고를게요</span>
                <span className="choice-tag">1~45 중에서 마음에 드는 번호로</span>
              </span>
              <span className="choice-arrow" aria-hidden>
                ›
              </span>
            </button>
          </div>
        </Screen>
      </>
    );
  }

  if (step.kind === 'manual') {
    return (
      <>
        {header}
        <Screen>
          <h2 className="title" style={{ fontSize: 24, lineHeight: '34px' }}>
            어떤 번호를 담을까요?
          </h2>
          <Body dim style={{ margin: '8px 0 20px' }}>
            이미 담은 번호는 고를 수 없어요.
          </Body>
          <NumberPicker selected={manual ? [manual] : []} onToggle={(n) => setManual(n === manual ? null : n)} disabled={picks} />
          <div style={{ marginTop: 24 }}>
            <Button label={manual ? `${manual}번 담기` : '번호를 하나 골라 주세요'} onPress={() => manual && put(manual)} disabled={!manual} />
          </div>
        </Screen>
      </>
    );
  }

  const cat = step.kind === 'category' ? categories.find((c) => c.key === step.key) ?? null : step.from;
  const n = step.kind === 'category' ? cat?.nums[0] : step.n;
  if (n === undefined) return <Navigate to="/" replace />;
  const taken = picks.includes(n);

  return (
    <>
      {header}
      <Screen>
        <div className="sheet-head" style={{ marginBottom: 8 }}>
          <span className="sheet-emoji" aria-hidden>
            {step.kind === 'random' ? '🎲' : cat?.emoji}
          </span>
          <div style={{ flex: 1 }}>
            <h2 className="sheet-title">{step.kind === 'random' ? '무작위로 골랐어요' : cat?.title}</h2>
            <span className="dim small">{step.kind === 'random' ? (cat ? `${cat.title}에서 나왔어요` : '1~45 중에서 골랐어요') : cat?.tag}</span>
          </div>
        </div>

        {step.kind === 'category' && cat?.isDream ? (
          <div className="dreams" role="group" aria-label="간밤에 꾼 꿈" style={{ margin: '8px 0' }}>
            {DREAMS.map((d) => (
              <button key={d.key} type="button" aria-pressed={d.key === todayDream} onClick={() => setTodayDream(d.key as DreamKey)}>
                {d.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="sheet-number" style={{ padding: '16px 0' }}>
          <LottoBall n={n} size={80} />
        </div>

        {cat ? <Body>{cat.story}</Body> : null}

        <div className="stack" style={{ marginTop: 24 }}>
          <Button label={taken ? '이미 담았어요' : '이 숫자 담기'} onPress={() => put(n)} disabled={taken} />
          <Button label="다른 숫자 고르기" kind="secondary" onPress={() => setStep({ kind: 'ask' })} />
        </div>
      </Screen>
    </>
  );
}
