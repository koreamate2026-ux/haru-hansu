import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ElementBars } from '../components/ElementBars';
import { LottoBall } from '../components/LottoBall';
import { PillarTable } from '../components/PillarTable';
import { Body, Button, Screen, Section, Title } from '../components/ui';
import { ELEMENT_INFO } from '../lib/elements';
import { DAY_MASTER_TEXT, STRENGTH_TEXT, dailyFortune } from '../lib/fortune';
import { useApp } from '../state/AppState';

const STRENGTH_LABEL = { strong: '타고난 힘이 센 편', weak: '타고난 힘이 여린 편', balanced: '타고난 힘이 고른 편' } as const;

export default function Saju() {
  const navigate = useNavigate();
  const { activeProfile, activeChart } = useApp();
  const fortune = useMemo(
    () => (activeProfile && activeChart ? dailyFortune(activeProfile, activeChart) : null),
    [activeProfile, activeChart],
  );
  if (!activeProfile || !activeChart || !fortune) return null;

  const c = activeChart;
  const dm = ELEMENT_INFO[c.dayMaster.element];
  const useful = ELEMENT_INFO[c.usefulElement];
  const p = activeProfile;
  const birth = `${p.calendar === 'lunar' ? '음력' : '양력'} ${p.year}.${p.month}.${p.day}${p.leapMonth ? '(윤)' : ''}${p.hour !== null ? ` ${p.hour}시 ${p.minute}분` : ''}`;

  return (
    <Screen tabs>
      <Title sub={`${birth} · ${c.animal}띠 · ${p.calendar === 'lunar' ? `양력 ${c.solarDate}` : c.lunarLabel}`}>{p.name}님의 사주</Title>

      <Section>
        <PillarTable chart={c} />
        {c.dstAdjusted ? (
          <Body dim small style={{ marginTop: 12 }}>
            서머타임 기간에 태어나 시계 시각에서 1시간을 빼고 계산했어요.
          </Body>
        ) : null}
      </Section>

      <section className="section">
        <h2 className="section-title">
          나를 나타내는 글자: <span className="hanja">{c.dayMaster.hanja}</span> ({dm.name})
        </h2>
        <Body>{DAY_MASTER_TEXT[c.dayMaster.element]}</Body>
        <Body dim small style={{ marginTop: 8 }}>
          태어난 날 위쪽 글자(금색 테두리)가 바로 ‘나’예요. 사주는 이 글자를 중심으로 풀어요.
        </Body>
      </section>

      <Section title="타고난 다섯 기운">
        <ElementBars values={c.counts} mark={c.usefulElement} />
        <Body dim small style={{ marginTop: 12 }}>
          여덟 글자가 나무·불·흙·쇠·물 중 어디에 속하는지 센 거예요. 태어난 달은 계절의 힘이 커서 두 번 셌어요.
        </Body>
      </Section>

      <section className="section">
        <h2 className="section-title">나에게 필요한 기운: {useful.name}</h2>
        <Body>
          <strong>{STRENGTH_LABEL[c.strength]}</strong>이에요. {STRENGTH_TEXT[c.strength]}
        </Body>
        <Body dim style={{ marginTop: 8 }}>
          {useful.name} 번호는 끝자리가 {useful.digits.join('·')}인 번호예요. 행운의 색은 {useful.colorName}, 방향은 {useful.direction}이에요.
        </Body>
      </section>

      <div className="card fortune">
        <div className="fortune-head">
          <div style={{ flex: 1 }}>
            <span className="dim small">
              {fortune.dateLabel} 오늘의 운세
            </span>
            <h2 className="fortune-title">{fortune.headline}</h2>
          </div>
          <span className="score" aria-label={`오늘의 점수 100점 중 ${fortune.score}점`}>
            {fortune.score}
            <span className="score-unit">점</span>
          </span>
        </div>
        <Body>{fortune.body}</Body>
        <dl className="kv" style={{ margin: 0 }}>
          <dt>재물</dt>
          <dd>{fortune.money}</dd>
          <dt>사람</dt>
          <dd>{fortune.people}</dd>
          <dt>한 가지</dt>
          <dd>{fortune.tip}</dd>
        </dl>
        <div className="lucky-row">
          <LottoBall n={fortune.luckyNumber} size={40} />
          <Body dim style={{ flex: 1, fontSize: 14 }}>
            오늘의 숫자 {fortune.luckyNumber} · {fortune.luckyColor} · {fortune.luckyDirection}
          </Body>
        </div>
      </div>

      <Button label="생년월일 수정" kind="secondary" onPress={() => navigate(`/profile?id=${encodeURIComponent(p.id)}`)} />
    </Screen>
  );
}
