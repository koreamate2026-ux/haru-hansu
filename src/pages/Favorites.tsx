import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Body, Button, Header, Screen, Section, Segmented } from '../components/ui';
import { ApiError, type ApiFavoriteInput } from '../lib/api';
import { FigureArt } from '../components/FigureArt';
import { FIGURE_CATEGORIES, HISTORICAL, type FigureCategory } from '../lib/historical';
import { BirthDateError, HISTORIC_MIN_YEAR, toSolar } from '../lib/saju';
import { useAuth } from '../state/AuthState';
import { useBilling } from '../state/BillingState';
import { useFavorites } from '../state/FavoritesState';

const birthLabel = (calendar: 'solar' | 'lunar', y: number, m: number, d: number) => `${calendar === 'lunar' ? '음력' : '양력'} ${y}.${m}.${d}`;

/** 좋아하는 연예인·위인 관리(플러스 전용). 위인은 목록에서, 연예인은 직접 입력 */
export default function Favorites() {
  const navigate = useNavigate();
  const { account } = useAuth();
  const { loaded, premium } = useBilling();
  const { favorites, active, setActive, add, remove } = useFavorites();
  const [tab, setTab] = useState<'historical' | 'custom'>('historical');
  const [figureCat, setFigureCat] = useState<FigureCategory | '전체'>('전체');
  const [name, setName] = useState('');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!account) return <Navigate to="/login" replace />;

  if (loaded && !premium) {
    return (
      <>
        <Header title="좋아하는 사람" fallback="/" />
        <Screen>
          <h2 className="title" style={{ fontSize: 24, lineHeight: '34px' }}>
            하루 한수 플러스 기능이에요
          </h2>
          <p className="sub" style={{ margin: '8px 0 24px' }}>
            좋아하는 연예인이나 존경하는 위인과 내 사주를 함께 보고, 둘에게 맞는 오늘의 궁합 숫자를 알려 드려요.
          </p>
          <Button label="플러스 알아보기" onPress={() => navigate('/premium')} />
        </Screen>
      </>
    );
  }

  const save = async (input: ApiFavoriteInput) => {
    setBusy(true);
    setMsg(null);
    try {
      await add(input);
      setMsg({ ok: true, text: `${input.name} 님을 추가했어요. 홈에서 궁합 숫자를 볼 수 있어요.` });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : '추가하지 못했어요.' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addCustom = async () => {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    try {
      toSolar({ calendar, leapMonth: false, year: y, month: m, day: d, hour: null, minute: 0 }, HISTORIC_MIN_YEAR);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof BirthDateError ? e.message : '생년월일을 확인해 주세요.' });
      return;
    }
    const ok = await save({
      name: name.trim(),
      kind: 'custom',
      historicalKey: null,
      calendar,
      leapMonth: false,
      birthYear: y,
      birthMonth: m,
      birthDay: d,
      birthHour: null,
      birthMinute: 0,
    });
    if (ok) {
      setName('');
      setYear('');
      setMonth('');
      setDay('');
    }
  };

  const onRemove = async (id: string, who: string) => {
    if (!window.confirm(`${who} 님을 지울까요?`)) return;
    setBusy(true);
    try {
      await remove(id);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : '지우지 못했어요.' });
    } finally {
      setBusy(false);
    }
  };

  const takenKeys = new Set(favorites.map((f) => f.historicalKey).filter(Boolean));
  const digits = (v: string) => v.replace(/[^0-9]/g, '');

  return (
    <>
      <Header title="좋아하는 사람" fallback="/" />
      <Screen>
        {msg ? (
          <Body small style={{ color: msg.ok ? 'var(--gold)' : 'var(--danger)', marginBottom: 16 }}>
            {msg.text}
          </Body>
        ) : null}

        <Section title="내가 등록한 사람">
          {favorites.length ? (
            <div className="stack" style={{ gap: 8 }}>
              {favorites.map((f) => {
                const on = f.id === active?.id;
                return (
                  <div key={f.id} className="person" style={{ borderColor: on ? 'var(--gold)' : 'transparent' }}>
                    {f.historicalKey ? <FigureArt figureKey={f.historicalKey} size={40} /> : <span className="figure-art" style={{ width: 40, height: 40 }} aria-hidden>💖</span>}
                    <button type="button" className="person-main" onClick={() => setActive(f.id)} aria-pressed={on}>
                      <div className="person-name">
                        {f.name}
                        {on ? <span className="dim"> · 홈에서 보는 중</span> : null}
                      </div>
                      <div className="person-detail">{birthLabel(f.calendar, f.birthYear, f.birthMonth, f.birthDay)}</div>
                    </button>
                    <button type="button" className="text-btn" onClick={() => onRemove(f.id, f.name)} disabled={busy}>
                      지우기
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <Body dim small>
              아직 없어요. 아래에서 좋아하는 사람을 추가해 보세요.
            </Body>
          )}
        </Section>

        <Section title="추가하기">
          <div style={{ marginBottom: 16 }}>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'historical', label: '위인 목록' },
                { value: 'custom', label: '직접 입력' },
              ]}
            />
          </div>

          {tab === 'historical' ? (
            <>
              <div className="chips" style={{ marginBottom: 12 }}>
                {(['전체', ...FIGURE_CATEGORIES] as const).map((c) => (
                  <button key={c} type="button" className={figureCat === c ? 'chip on' : 'chip'} onClick={() => setFigureCat(c)}>
                    {c}
                  </button>
                ))}
              </div>
              {FIGURE_CATEGORIES.filter((c) => figureCat === '전체' || figureCat === c).map((c) => (
                <div key={c} style={{ marginBottom: 16 }}>
                  {figureCat === '전체' ? <h3 className="detail-head">{c}</h3> : null}
                  <div className="choices">
                    {HISTORICAL.filter((h) => h.category === c).map((h) => {
                      const taken = takenKeys.has(h.key);
                      return (
                        <button
                          key={h.key}
                          type="button"
                          className="choice"
                          disabled={taken || busy}
                          onClick={() =>
                            save({
                              name: h.name,
                              kind: 'historical',
                              historicalKey: h.key,
                              calendar: h.calendar,
                              leapMonth: false,
                              birthYear: h.year,
                              birthMonth: h.month,
                              birthDay: h.day,
                              birthHour: null,
                              birthMinute: 0,
                            })
                          }
                        >
                          <FigureArt figureKey={h.key} size={44} />
                          <span className="choice-main">
                            <span className="choice-title">{h.name}</span>
                            <span className="choice-tag">
                              {h.desc} · {birthLabel(h.calendar, h.year, h.month, h.day)}
                            </span>
                          </span>
                          <span className={taken ? 'choice-hint' : 'choice-arrow'}>{taken ? '추가됨' : '＋'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="notice" style={{ marginTop: 12 }}>
                생일은 널리 알려진 기록을 따랐어요. 태어난 시간은 알 수 없어서 시간 없이 계산해요.
              </p>
            </>
          ) : (
            <div className="stack">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 좋아하는 가수)" maxLength={20} aria-label="이름" />
              <Segmented
                value={calendar}
                onChange={setCalendar}
                options={[
                  { value: 'solar', label: '양력' },
                  { value: 'lunar', label: '음력' },
                ]}
              />
              <div className="row">
                <input className="input" value={year} onChange={(e) => setYear(digits(e.target.value))} placeholder="1995" inputMode="numeric" maxLength={4} style={{ flex: 1.4 }} aria-label="태어난 해" />
                <input className="input" value={month} onChange={(e) => setMonth(digits(e.target.value))} placeholder="월" inputMode="numeric" maxLength={2} style={{ flex: 1 }} aria-label="태어난 달" />
                <input className="input" value={day} onChange={(e) => setDay(digits(e.target.value))} placeholder="일" inputMode="numeric" maxLength={2} style={{ flex: 1 }} aria-label="태어난 날" />
              </div>
              <Button label={busy ? '추가하는 중…' : '추가하기'} onPress={addCustom} disabled={busy || !name.trim() || year.length !== 4 || !month || !day} />
              <p className="notice">연예인처럼 목록에 없는 사람은 이름과 생일을 직접 넣어 주세요. 입력한 정보는 내 계정에만 저장돼요.</p>
            </div>
          )}
        </Section>
      </Screen>
    </>
  );
}
