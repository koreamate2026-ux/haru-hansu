import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ElementBars } from '../components/ElementBars';
import { PlusOnly, TodayNumberCard } from '../components/PlusDetail';
import { Body, Button, Header, Screen, Section } from '../components/ui';
import { ELEMENTS, ELEMENT_INFO } from '../lib/elements';
import { elementLabel, pairText, relationBetween, zodiacMatch } from '../lib/plusDetail';
import { computeChart, type SajuChart } from '../lib/saju';
import { REL_NAME } from '../lib/sajuDetail';
import { useTodayCategories } from '../lib/todayNumbers';
import type { Element, Profile } from '../lib/types';
import { useApp } from '../state/AppState';

export default function PlusCompat() {
  return (
    <PlusOnly>
      <CompatBody />
    </PlusOnly>
  );
}

function CompatBody() {
  const navigate = useNavigate();
  const { profiles, activeProfile } = useApp();
  const { categories } = useTodayCategories();
  const cat = categories?.find((c) => c.key === 'compat') ?? null;
  const [baseId, setBaseId] = useState<string | null>(activeProfile?.id ?? null);

  const members = useMemo(
    () =>
      profiles
        .map((p) => {
          try {
            return { p, chart: computeChart(p) };
          } catch {
            return null;
          }
        })
        .filter((x): x is { p: Profile; chart: SajuChart } => x !== null),
    [profiles],
  );

  const combined = useMemo(() => {
    const c: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    for (const m of members) for (const e of ELEMENTS) c[e] += m.chart.counts[e];
    return c;
  }, [members]);
  const weakest = [...ELEMENTS].sort((a, b) => combined[a] - combined[b])[0];
  const w = ELEMENT_INFO[weakest];
  const base = members.find((m) => m.p.id === baseId) ?? members[0];

  return (
    <>
      <Header title="가족 궁합" fallback="/" />
      <Screen>
        {members.length < 2 || !base ? (
          <>
            <Body dim style={{ marginBottom: 20 }}>
              가족이나 친구를 한 명 더 등록하면, 함께 본 사주로 가족 궁합과 오늘의 궁합 숫자를 알려 드려요.
            </Body>
            <Button label="가족·친구 추가" onPress={() => navigate('/profile')} />
          </>
        ) : (
          <>
            {cat && !cat.empty ? <TodayNumberCard category={cat} /> : null}

            <Section title="가족이 함께 가진 기운">
              <ElementBars values={combined} mark={weakest} />
              <Body dim small style={{ marginTop: 12 }}>
                {members.map((m) => m.p.name).join('·')} 님을 모두 합치면 {elementLabel(weakest)} 기운이 가장 적어요. 가족이 함께 {w.colorName} 물건을
                가까이 두거나 {w.direction}으로 나들이를 가 보면 모자란 기운을 채우는 데 도움이 된대요.
              </Body>
            </Section>

            <Section title="한 사람씩 보기">
              <div className="stack" style={{ gap: 8 }}>
                {members.map(({ p, chart }) => (
                  <div key={p.id} className="person">
                    <div className="person-main">
                      <div className="person-name">
                        {p.name} <span className="hanja dim">{chart.dayMaster.hanja}</span>
                      </div>
                      <div className="person-detail">
                        {chart.animal}띠 · 타고난 기운 {elementLabel(chart.dayMaster.element)} · 필요한 기운 {elementLabel(chart.usefulElement)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="서로 어떤 사이일까요">
              <div className="chips" style={{ marginBottom: 12 }}>
                {members.map(({ p }) => (
                  <button key={p.id} type="button" className={p.id === base.p.id ? 'chip on' : 'chip'} onClick={() => setBaseId(p.id)}>
                    {p.name} 기준
                  </button>
                ))}
              </div>
              <div className="stack" style={{ gap: 16 }}>
                {members
                  .filter((m) => m.p.id !== base.p.id)
                  .map((other) => {
                    const rel = relationBetween(base.chart, other.chart);
                    const z = zodiacMatch(base.chart, other.chart);
                    return (
                      <div key={other.p.id} className="luck">
                        <div className="luck-top">
                          <strong>
                            {base.p.name} ↔ {other.p.name}
                          </strong>
                          <span className="dim small">{REL_NAME[rel]}</span>
                        </div>
                        <Body small>{pairText(base.p.name, other.p.name, rel)}</Body>
                        <Body dim small style={{ marginTop: 6 }}>
                          {z.label} · {z.text}
                        </Body>
                      </div>
                    );
                  })}
              </div>
            </Section>
            <p className="notice">사주 풀이는 재미로 보는 참고용이에요.</p>
          </>
        )}
      </Screen>
    </>
  );
}
