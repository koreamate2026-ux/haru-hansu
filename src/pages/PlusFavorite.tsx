import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ElementBars } from '../components/ElementBars';
import { FigureArt } from '../components/FigureArt';
import { PlusOnly, TodayNumberCard } from '../components/PlusDetail';
import { Body, Button, Header, Screen, Section } from '../components/ui';
import { ELEMENTS } from '../lib/elements';
import { elementLabel, pairText, relationBetween, zodiacMatch } from '../lib/plusDetail';
import { HISTORIC_MIN_YEAR, computeChart } from '../lib/saju';
import { REL_NAME } from '../lib/sajuDetail';
import { useTodayCategories } from '../lib/todayNumbers';
import type { Element } from '../lib/types';
import { useApp } from '../state/AppState';
import { favoriteAsProfile, useFavorites } from '../state/FavoritesState';

export default function PlusFavorite() {
  return (
    <PlusOnly>
      <FavoriteBody />
    </PlusOnly>
  );
}

function FavoriteBody() {
  const navigate = useNavigate();
  const { activeProfile, activeChart } = useApp();
  const { favorites, active, setActive } = useFavorites();
  const { categories } = useTodayCategories();
  const cat = categories?.find((c) => c.key === 'favorite') ?? null;

  const theirs = useMemo(() => {
    if (!active) return null;
    try {
      return computeChart(favoriteAsProfile(active), HISTORIC_MIN_YEAR);
    } catch {
      return null;
    }
  }, [active]);

  const combined = useMemo(() => {
    const c: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    if (activeChart && theirs) for (const e of ELEMENTS) c[e] = activeChart.counts[e] + theirs.counts[e];
    return c;
  }, [activeChart, theirs]);
  const weakest = [...ELEMENTS].sort((a, b) => combined[a] - combined[b])[0];

  if (!active) {
    return (
      <>
        <Header title="좋아하는 사람과 궁합" fallback="/" />
        <Screen>
          <Body dim style={{ marginBottom: 20 }}>
            좋아하는 연예인이나 존경하는 위인을 등록하면 나와의 궁합과 오늘의 궁합 숫자를 알려 드려요.
          </Body>
          <Button label="좋아하는 사람 추가하기" onPress={() => navigate('/favorites')} />
        </Screen>
      </>
    );
  }

  const me = activeProfile;
  const rel = activeChart && theirs ? relationBetween(activeChart, theirs) : null;
  const z = activeChart && theirs ? zodiacMatch(activeChart, theirs) : null;

  return (
    <>
      <Header title="좋아하는 사람과 궁합" fallback="/" />
      <Screen>
        {favorites.length > 1 ? (
          <div className="chips" style={{ marginBottom: 16 }}>
            {favorites.map((f) => (
              <button key={f.id} type="button" className={f.id === active.id ? 'chip on' : 'chip'} onClick={() => setActive(f.id)}>
                {f.name}
              </button>
            ))}
          </div>
        ) : null}

        {cat && !cat.empty ? <TodayNumberCard category={cat} /> : null}

        {me && activeChart && theirs && rel && z ? (
          <>
            <Section title="두 사람의 타고난 기운">
              <div className="compare">
                <div>
                  <span className="dim small">{me.name}</span>
                  <strong className="hanja">{activeChart.dayMaster.hanja}</strong>
                  <span className="small">{elementLabel(activeChart.dayMaster.element)}</span>
                  <span className="faint small">{activeChart.animal}띠</span>
                </div>
                <div>
                  {active.historicalKey ? <FigureArt figureKey={active.historicalKey} size={52} /> : null}
                  <span className="dim small">{active.name}</span>
                  <strong className="hanja">{theirs.dayMaster.hanja}</strong>
                  <span className="small">{elementLabel(theirs.dayMaster.element)}</span>
                  <span className="faint small">{theirs.animal}띠</span>
                </div>
              </div>
            </Section>

            <Section title="어떤 사이일까요">
              <div className="luck">
                <div className="luck-top">
                  <strong>{REL_NAME[rel]}</strong>
                </div>
                <Body small>{pairText(me.name, active.name, rel)}</Body>
              </div>
              <div className="luck">
                <div className="luck-top">
                  <strong>{z.label}</strong>
                </div>
                <Body small>{z.text}</Body>
              </div>
            </Section>

            <Section title="둘이 함께 가진 기운">
              <ElementBars values={combined} mark={weakest} />
              <Body dim small style={{ marginTop: 12 }}>
                두 사람을 합치면 {elementLabel(weakest)} 기운이 가장 적어요. 오늘의 궁합 숫자는 이 기운에서 골랐어요.
              </Body>
            </Section>
          </>
        ) : (
          <Body dim>생년월일을 확인할 수 없어 궁합을 계산하지 못했어요.</Body>
        )}

        <Button label="좋아하는 사람 바꾸기·추가" kind="secondary" onPress={() => navigate('/favorites')} />
        <p className="notice" style={{ marginTop: 12 }}>
          재미로 보는 궁합이에요. {active.kind === 'historical' ? '위인의 생일은 널리 알려진 기록을 따랐어요.' : ''}
        </p>
      </Screen>
    </>
  );
}
