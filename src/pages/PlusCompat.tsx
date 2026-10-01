import { useMemo, useState } from 'react';
import { CompatWizard } from '../components/CompatWizard';
import { ElementBars } from '../components/ElementBars';
import { BallRow } from '../components/LottoBall';
import { PlusOnly, TodayNumberCard } from '../components/PlusDetail';
import { Body, Button, Header, Screen, Section } from '../components/ui';
import { REL_CHOICES, REL_INFO, analyzePair, familyNumbers, personalityOf, type FamilyRel } from '../lib/compatDetail';
import { ELEMENT_INFO } from '../lib/elements';
import { elementLabel } from '../lib/plusDetail';
import { useRelations } from '../lib/relations';
import { computeChart, type SajuChart } from '../lib/saju';
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

type Member = { p: Profile; chart: SajuChart };

const elNames = (list: Element[]) => list.map((e) => `${ELEMENT_INFO[e].name}(${ELEMENT_INFO[e].hanja})`).join('·');

/** 좋은 숫자·피할 숫자 두 줄 */
function NumberPair({ good, avoid }: { good: number[]; avoid: number[] }) {
  return (
    <div className="num-pair">
      <div>
        <span className="num-pair-label good">함께하면 좋은 숫자</span>
        <BallRow numbers={good} size={30} />
      </div>
      <div>
        <span className="num-pair-label avoid">피하면 좋은 숫자</span>
        <div className="balls-avoid">
          <BallRow numbers={avoid} size={30} />
        </div>
      </div>
    </div>
  );
}

export function CompatBody() {
  const { profiles, activeProfile } = useApp();
  const { categories } = useTodayCategories();
  const cat = categories?.find((c) => c.key === 'compat') ?? null;
  const [baseId, setBaseId] = useState<string | null>(activeProfile?.id ?? null);
  const relations = useRelations();

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
        .filter((x): x is Member => x !== null),
    [profiles],
  );

  const family = useMemo(() => (members.length >= 2 ? familyNumbers(members.map((m) => ({ id: m.p.id, chart: m.chart }))) : null), [members]);
  const base = members.find((m) => m.p.id === baseId) ?? members[0];
  // 함께 볼 사람이 모자라면 들어오자마자 시작 팝업을 띄운다
  const [wizard, setWizard] = useState(() => members.length < 2);

  return (
    <>
      <Header title="가족 궁합" fallback="/" />
      <Screen>
        {members.length < 2 || !base || !family ? (
          <>
            <Body dim style={{ marginBottom: 20 }}>
              가족이나 친구를 한 명 더 등록하면, 함께 본 사주로 가족 궁합과 오늘의 궁합 숫자를 알려 드려요.
            </Body>
            <Button label="함께 볼 사람 추가하기" onPress={() => setWizard(true)} />
          </>
        ) : (
          <>
            {cat && !cat.empty ? <TodayNumberCard category={cat} /> : null}

            <Section title="두 사람씩 보기">
              <div className="chips" style={{ marginBottom: 12 }}>
                {members.map(({ p }) => (
                  <button key={p.id} type="button" className={p.id === base.p.id ? 'chip on' : 'chip'} onClick={() => setBaseId(p.id)}>
                    {p.name} 기준
                  </button>
                ))}
              </div>
              <div className="stack" style={{ gap: 14 }}>
                {members
                  .filter((m) => m.p.id !== base.p.id)
                  .map((other) => (
                    <PairCard
                      key={other.p.id}
                      base={base}
                      other={other}
                      rel={relations.get(base.p.id, other.p.id)}
                      onRel={(r) => relations.set(base.p.id, other.p.id, r)}
                    />
                  ))}
              </div>
            </Section>

            <Section title="한 사람씩 성향">
              <div className="stack" style={{ gap: 10 }}>
                {members.map(({ p, chart }) => {
                  const t = personalityOf(chart);
                  const rel = p.id === base.p.id ? null : relations.get(base.p.id, p.id);
                  return (
                    <div key={p.id} className="trait-card">
                      <div className="trait-head">
                        <span className="trait-emoji" aria-hidden>
                          {t.emoji}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong>{p.name}</strong>
                          <span className="dim small">
                            {' '}
                            · {rel && REL_INFO[rel].label !== p.name ? `${REL_INFO[rel].label} · ` : ''}
                            {t.image} {t.stem} · {chart.animal}띠
                          </span>
                        </div>
                      </div>
                      <div className="trait-keywords">
                        {t.keywords.map((k) => (
                          <span key={k}>#{k}</span>
                        ))}
                      </div>
                      <Body small style={{ margin: '6px 0 0' }}>
                        {t.summary}
                      </Body>
                      <Body dim small style={{ margin: '4px 0 0' }}>
                        가족 안에서는 <strong>{t.familyRole}</strong>. {t.caution}
                      </Body>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="가족이 다 함께">
              <ElementBars values={family.combined} mark={family.good[0]} />
              <Body dim small style={{ margin: '12px 0' }}>
                {members.map((m) => m.p.name).join('·')} 님을 모두 합치면 {elementLabel(family.good[0])} 기운이 가장 적고, {elNames(family.avoid)} 기운은 넉넉하거나 모자란
                기운을 눌러요. 가족이 함께 고를 때는 아래 숫자를 참고해 보세요.
              </Body>
              <NumberPair good={family.goodNumbers} avoid={family.avoidNumbers} />
            </Section>

            <p className="notice">사주 풀이와 숫자는 재미로 보는 참고용이에요. 어떤 숫자든 당첨 확률은 같아요.</p>
            <Button label="함께 볼 사람 추가하기" kind="secondary" onPress={() => setWizard(true)} />
          </>
        )}
      </Screen>
      {wizard ? <CompatWizard onClose={() => setWizard(false)} /> : null}
    </>
  );
}

function PairCard({ base, other, rel, onRel }: { base: Member; other: Member; rel: FamilyRel | null; onRel: (r: FamilyRel | null) => void }) {
  const a = useMemo(
    () => analyzePair({ id: base.p.id, name: base.p.name, chart: base.chart }, { id: other.p.id, name: other.p.name, chart: other.chart }, rel),
    [base, other, rel],
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="pair-card">
      <div className="pair-head">
        <strong>
          {base.p.name} ↔ {other.p.name}
        </strong>
        <label className="rel-select">
          <span className="sr-only">
            {base.p.name} 님에게 {other.p.name} 님은
          </span>
          <select value={rel ?? ''} onChange={(e) => onRel((e.target.value || null) as FamilyRel | null)}>
            <option value="">관계 고르기</option>
            {/* 거꾸로 읽은 '부모님'도 고른 값으로 보이게 */}
            {[...REL_CHOICES, ...(rel === 'parent' ? (['parent'] as FamilyRel[]) : [])].map((r) => (
              <option key={r} value={r}>
                {REL_INFO[r].emoji} {REL_INFO[r].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="score-row">
        <div className="score-bar" aria-hidden>
          <span style={{ width: `${a.score}%` }} />
        </div>
        <span className="score-num">{a.score}점</span>
      </div>
      <span className="score-grade">{a.grade}</span>

      <Body small style={{ margin: '10px 0 0' }}>
        {a.styleText}
      </Body>
      <Body small style={{ margin: '6px 0 0' }}>
        {a.flowText} {rel ? a.roleTip : null}
      </Body>
      {!rel ? (
        <Body dim small style={{ margin: '6px 0 0' }}>
          관계를 고르면 {REL_INFO.mother.label}·{REL_INFO.spouse.label}처럼 사이에 맞춘 조언을 알려 드려요.
        </Body>
      ) : null}
      <Body dim small style={{ margin: '6px 0 0' }}>
        {a.zodiac.label} · {a.zodiac.text}
      </Body>

      <div style={{ marginTop: 12 }}>
        <NumberPair good={a.goodNumbers} avoid={a.avoidNumbers} />
        <Body dim small style={{ margin: '8px 0 0' }}>
          {a.numberReason}
        </Body>
      </div>

      <button type="button" className="text-btn" style={{ marginTop: 8 }} onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? '점수 근거 접기' : '점수 근거 보기'}
      </button>
      {open ? (
        <ul className="score-points">
          <li>
            <span>기본</span>
            <span>50</span>
          </li>
          {a.points.map((p) => (
            <li key={p.label}>
              <span>{p.label}</span>
              <span className={p.value < 0 ? 'minus' : ''}>{p.value > 0 ? `+${p.value}` : p.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
