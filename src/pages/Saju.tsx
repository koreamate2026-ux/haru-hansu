import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdFitPopup, adFitPopupEnabled } from '../components/Ads';
import { ElementBars } from '../components/ElementBars';
import { LottoBall } from '../components/LottoBall';
import { PillarTable } from '../components/PillarTable';
import { Body, Button, Screen, Section, Title } from '../components/ui';
import { ELEMENT_INFO } from '../lib/elements';
import { DAY_MASTER_TEXT, STRENGTH_TEXT, dailyFortune } from '../lib/fortune';
import { elementName, sajuDetail, type LuckItem } from '../lib/sajuDetail';
import { useApp } from '../state/AppState';
import { useBilling } from '../state/BillingState';

const STRENGTH_LABEL = { strong: '타고난 힘이 센 편', weak: '타고난 힘이 여린 편', balanced: '타고난 힘이 고른 편' } as const;

export default function Saju() {
  const navigate = useNavigate();
  const { activeProfile, activeChart } = useApp();
  const { loaded: billingLoaded, premium } = useBilling();
  const [adDone, setAdDone] = useState(!adFitPopupEnabled);
  const fortune = useMemo(
    () => (activeProfile && activeChart ? dailyFortune(activeProfile, activeChart) : null),
    [activeProfile, activeChart],
  );
  const detail = useMemo(
    () => (premium && activeProfile && activeChart ? sajuDetail(activeProfile, activeChart) : null),
    [premium, activeProfile, activeChart],
  );
  // 플러스 회원인지 확인되기 전에는 광고도 내용도 보여주지 않는다
  if (!adDone && !billingLoaded) return <Screen tabs>{null}</Screen>;
  if (!adDone && !premium) {
    return (
      <Screen tabs>
        <AdFitPopup onClose={() => setAdDone(true)} onUpgrade={() => navigate('/premium')} />
      </Screen>
    );
  }
  if (!activeProfile || !activeChart || !fortune) return null;

  const c = activeChart;
  const dm = ELEMENT_INFO[c.dayMaster.element];
  const useful = ELEMENT_INFO[c.usefulElement];
  const p = activeProfile;
  const birth = `${p.calendar === 'lunar' ? '음력' : '양력'} ${p.year}.${p.month}.${p.day}${p.leapMonth ? '(윤)' : ''}${p.hour !== null ? ` ${p.hour}시 ${p.minute}분` : ''}`;

  return (
    <Screen tabs>
      <Title sub={`${birth} · ${c.animal}띠 · ${p.calendar === 'lunar' ? `양력 ${c.solarDate}` : c.lunarLabel}`}>{p.name}님의 사주</Title>

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

      <Section>
        <PillarTable chart={c} />
        {c.dstAdjusted || c.solarAdjustMinutes ? (
          <Body dim small style={{ marginTop: 12 }}>
            {c.dstAdjusted ? '서머타임 기간에 태어나 시계 시각에서 1시간을 빼고, ' : ''}
            {c.solarAdjustMinutes
              ? `한국 경도에 맞춰 태어난 시각에서 ${c.solarAdjustMinutes}분을 빼고(진태양시) 시주를 정했어요. 설정에서 끌 수 있어요.`
              : '계산했어요.'}
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
          여덟 글자가 나무·불·흙·쇠·물 중 어디에 속하는지 센 거예요. 태어난 달은 계절의 힘이 커서 두 번 셌고, 지지 속에 숨은 기운(지장간)도 조금씩 더했어요.
        </Body>
      </Section>

      <section className="section">
        <h2 className="section-title">나에게 필요한 기운: {useful.name}</h2>
        <Body>
          <strong>{STRENGTH_LABEL[c.strength]}</strong>이에요. {c.seasonSupport ? '태어난 계절이 나를 도와 힘을 얻었어요. ' : '태어난 계절이 나를 돕지 않아 힘이 조금 빠졌어요. '}
          {STRENGTH_TEXT[c.strength]}
        </Body>
        <Body dim style={{ marginTop: 8 }}>
          {useful.name} 번호는 끝자리가 {useful.digits.join('·')}인 번호예요. 행운의 색은 {useful.colorName}, 방향은 {useful.direction}이에요.
        </Body>
      </section>

      {detail ? (
        <Section title="자세한 풀이">
          <h3 className="detail-head">10년 운의 흐름</h3>
          {detail.decades ? (
            <div className="stack" style={{ gap: 10, marginBottom: 20 }}>
              {detail.decades
                .filter((d) => d.current || d.startYear > new Date().getFullYear())
                .slice(0, 3)
                .map((d) => (
                  <div key={d.startYear} className={d.current ? 'card luck now' : 'luck'}>
                    <div className="luck-top">
                      <span className="hanja">{d.ganzhi}</span>
                      <span className="dim small">
                        {d.startAge}~{d.endAge}세 · {d.startYear}~{d.endYear}년{d.current ? ' · 지금' : ''}
                      </span>
                    </div>
                    <LuckText item={d} />
                  </div>
                ))}
            </div>
          ) : (
            <div className="luck" style={{ marginBottom: 20 }}>
              <Body dim small>
                성별을 넣으면 10년 단위 운의 흐름을 볼 수 있어요. 대운은 성별에 따라 흐르는 방향이 달라요.
              </Body>
              <button type="button" className="text-btn" onClick={() => navigate(`/profile?id=${encodeURIComponent(p.id)}`)}>
                성별 넣으러 가기
              </button>
            </div>
          )}

          <h3 className="detail-head">{detail.year.label} 운</h3>
          <div className="luck" style={{ marginBottom: 20 }}>
            <div className="luck-top">
              <span className="hanja">{detail.year.ganzhi}</span>
            </div>
            <LuckText item={detail.year} />
          </div>

          <h3 className="detail-head">{detail.month.label} 운</h3>
          <div className="luck" style={{ marginBottom: 20 }}>
            <div className="luck-top">
              <span className="hanja">{detail.month.ganzhi}</span>
            </div>
            <LuckText item={detail.month} />
          </div>

          <h3 className="detail-head">타고난 성향</h3>
          <dl className="kv" style={{ margin: 0 }}>
            <dt>재물</dt>
            <dd>{detail.tendency.money}</dd>
            <dt>일</dt>
            <dd>{detail.tendency.work}</dd>
            <dt>사람</dt>
            <dd>{detail.tendency.people}</dd>
          </dl>
        </Section>
      ) : (
        <div className="card locked" style={{ marginBottom: 28 }}>
          <span className="dim small">하루 한수 플러스</span>
          <h2 className="section-title" style={{ margin: '4px 0 8px' }}>
            자세한 풀이
          </h2>
          <Body dim small style={{ marginBottom: 12 }}>
            10년 단위 운의 흐름, 올해·이번 달 운, 재물·일·사람 성향 풀이를 볼 수 있어요.
          </Body>
          <Button label="플러스로 자세히 보기" onPress={() => navigate('/premium')} />
        </div>
      )}

      <Button label="생년월일 수정" kind="secondary" onPress={() => navigate(`/profile?id=${encodeURIComponent(p.id)}`)} />
    </Screen>
  );
}

function LuckText({ item }: { item: LuckItem }) {
  return (
    <>
      <span className="dim small">
        {item.relationName} · {elementName(item.element)}
        {item.helpful ? ' · 나에게 필요한 기운' : ''}
      </span>
      <Body small style={{ marginTop: 6 }}>
        {item.text}
      </Body>
    </>
  );
}
