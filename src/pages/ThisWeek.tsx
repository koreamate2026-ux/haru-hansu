import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdSenseBanner } from '../components/Ads';
import { BallRow, LottoBall } from '../components/LottoBall';
import { NumberPicker } from '../components/NumberPicker';
import { Body, Button, Screen, useToast } from '../components/ui';
import { DREAMS, type DreamKey } from '../lib/luckyNumbers';
import { newId } from '../lib/random';
import { upcomingRound } from '../lib/rounds';
import { MAX_DAILY_PICKS, WEEKLY_SETS_PLUS, useTodayCategories, useWeeklyPicks } from '../lib/todayNumbers';
import { drawDate } from '../lib/rounds';
import { useApp } from '../state/AppState';
import { useBilling } from '../state/BillingState';
import { useFavorites } from '../state/FavoritesState';
import { FamilyLinkWizard } from '../components/FamilyLinkWizard';
import { FigureArt } from '../components/FigureArt';

const PERSONAL_KEYS = new Set(['zodiac', 'ohaeng', 'star', 'blood', 'stone', 'name', 'dream', 'today', 'lucky']);
const FAMILY_KEYS = new Set(['compat', 'family']);
/** 플러스 칸은 작은 창 대신 전용 상세 화면으로 연다 */
const PLUS_PAGES: Record<string, string> = { compat: '/plus/compat', family: '/plus/family', favorite: '/plus/favorite' };
/** 무료 회원에게 보여 줄 잠긴 가족 숫자 칸 */
const FAMILY_LOCKED = [
  { key: 'compat', emoji: '🤝', title: '가족 궁합 숫자' },
  { key: 'family', emoji: '👨‍👩‍👧', title: '가족 기념일 숫자' },
];

export default function ThisWeek() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profiles, activeProfile, activeChart, addTicket, hasTicket, todayDream, setTodayDream } = useApp();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { now, categories: allCategories } = useTodayCategories();
  const { picks: pickedNums, toggle: togglePicked, set: pickSet, limit: pickLimit, remaining: picksRemaining, canStartNew, startNew } = useWeeklyPicks();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const { premium } = useBilling();
  const { active: favorite } = useFavorites();

  useEffect(() => {
    if (!openKey) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenKey(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openKey]);

  if (!activeProfile || !activeChart || !allCategories) {
    return (
      <Screen tabs>
        <Body>정보를 불러오지 못했어요. 설정에서 생년월일을 다시 확인해 주세요.</Body>
      </Screen>
    );
  }

  const round = upcomingRound();
  const open = allCategories.find((c) => c.key === openKey) ?? null;
  const favoriteCat = allCategories.find((c) => c.key === 'favorite') ?? null;

  const tile = (c: (typeof allCategories)[number]) => (
    <button key={c.key} type="button" className={c.empty ? 'tile dim' : 'tile'} onClick={() => (PLUS_PAGES[c.key] ? navigate(PLUS_PAGES[c.key]) : setOpenKey(c.key))}>
      {c.key === 'favorite' && favorite?.historicalKey ? (
        <FigureArt figureKey={favorite.historicalKey} size={40} />
      ) : (
        <span className="tile-icon" aria-hidden>
          {c.emoji}
        </span>
      )}
      <span className="tile-label">{c.title}</span>
      {c.empty ? <span className="tile-hint">정보 필요</span> : null}
    </button>
  );

  const onSaveDailyPick = () => {
    if (pickedNums.length !== MAX_DAILY_PICKS) return;
    // 저장해도 이번 주 번호는 그대로 둔다(새 번호는 '새 번호 받기'로만)
    onSaveTicket(pickedNums, 'today-pick');
  };

  const onStartNew = () => {
    const left = pickLimit - pickSet;
    if (!window.confirm(`새 번호를 받을까요?\n지금 모은 번호는 사라지고(번호함에 저장한 번호는 남아요), 이번 주 남은 추천은 ${left - 1}번이 돼요.`)) return;
    startNew();
  };

  const onSaveTicket = (nums: number[], category: string, personIds?: string[]) => {
    if (hasTicket(round, nums)) return;
    const participants = personIds?.length ? personIds : [activeProfile.id];
    const participantNames = personIds?.length
      ? participants.map((id) => profiles.find((p) => p.id === id)?.name ?? '가족').join('·')
      : activeProfile.name;
    addTicket({
      id: newId(),
      profileId: participants[0],
      profileIds: participants,
      profileName: participantNames,
      round,
      numbers: nums,
      source: 'saju',
      category,
      createdAt: Date.now(),
    });
    navigator.vibrate?.(30);
    toast.show('번호함에 저장했어요');
  };

  const onCopy = (title: string, nums: number[]) => {
    const text = `${title}: ${nums.join(', ')}`;
    navigator.clipboard?.writeText(text).then(
      () => toast.show('번호를 복사했어요'),
      () => toast.show(text),
    );
  };

  return (
    <Screen tabs>
      <div className="quota-bar" role="status">
        <span aria-hidden>🎟️</span>
        <span>
          {pickedNums.length === 0 ? (
            <>
              이번 주 번호 추천 <strong>{picksRemaining}번</strong> 받을 수 있어요
            </>
          ) : pickedNums.length < MAX_DAILY_PICKS ? (
            <>
              이번 주 추천 <strong>{pickSet}번째</strong>를 모으는 중이에요 ({pickedNums.length}/{MAX_DAILY_PICKS})
            </>
          ) : picksRemaining > 0 ? (
            <>
              이번 주 추천 <strong>{picksRemaining}번</strong> 더 받을 수 있어요
            </>
          ) : (
            <>이번 주 번호 추천을 모두 받았어요</>
          )}
          <span className="quota-sub">
            1주일에 {pickLimit}번 · 제{round}회 {drawDate(round).m}월 {drawDate(round).d}일(토) 추첨 후 새로 받아요
          </span>
        </span>
        {!premium ? (
          <button type="button" className="quota-plus" onClick={() => navigate('/premium')}>
            플러스 {WEEKLY_SETS_PLUS}번
          </button>
        ) : null}
      </div>

      <p className="meta" style={{ marginBottom: 4 }}>
        {activeProfile.name}님, 오늘의 숫자를 알려 드려요
      </p>
      <h1 className="home-date">{`${now.getMonth() + 1}월 ${now.getDate()}일`}</h1>

      <div className="chips" style={{ marginTop: 14 }}>
        <span className="chip on">{activeChart.animal}띠</span>
        {activeProfile.bloodType ? <span className="chip on">{activeProfile.bloodType}형</span> : null}
      </div>

      <div className="hero-main" style={{ cursor: 'default', border: 'none' }}>
        <span className="dim small">
          이번 주 번호 모으기{pickLimit > 1 ? ` · ${pickSet}번째 추천` : ''}
        </span>
        <div className="sheet-number" style={{ padding: '10px 0', minHeight: 56 }}>
          {pickedNums.length ? (
            <BallRow numbers={pickedNums} size={40} />
          ) : (
            <Body dim small style={{ margin: 0 }}>
              버튼을 눌러 행운 숫자를 하나씩 모아보세요
            </Body>
          )}
        </div>
        <div className="stack" style={{ marginTop: 8, width: '100%' }}>
          {pickedNums.length >= MAX_DAILY_PICKS ? (
            <Button
              label={hasTicket(round, pickedNums) ? '번호함에 저장됨' : '번호함에 저장'}
              onPress={onSaveDailyPick}
              disabled={hasTicket(round, pickedNums)}
            />
          ) : (
            <Button label={`추가하기 (${pickedNums.length}/${MAX_DAILY_PICKS})`} onPress={() => navigate('/add-number')} />
          )}
          {pickedNums.length < MAX_DAILY_PICKS ? (
            <Button label="직접 추가" kind="secondary" onPress={() => setPickerOpen(true)} />
          ) : canStartNew ? (
            <Button label={`새 번호 받기 (이번 주 ${pickLimit - pickSet}번 남음)`} kind="secondary" onPress={onStartNew} />
          ) : (
            <p className="quota-done">
              {premium
                ? `이번 주 추천 ${pickLimit}번을 모두 받았어요. 토요일 추첨이 끝나면 새로 받을 수 있어요.`
                : `이번 주 추천을 받았어요. 토요일 추첨이 끝나면 새로 받을 수 있어요. 플러스는 1주일에 ${WEEKLY_SETS_PLUS}번까지 받을 수 있어요.`}
            </p>
          )}
        </div>
      </div>

      <AdSenseBanner />

      <p className="dim small" style={{ margin: '16px 0' }}>그림을 눌러 숫자를 확인해요</p>

      <h2 className="grid-head">나의 숫자</h2>
      <div className="cat-grid">{allCategories.filter((c) => PERSONAL_KEYS.has(c.key)).map(tile)}</div>

      <h2 className="grid-head">
        가족 숫자 <span className="plus-badge">플러스</span>
      </h2>
      <div className="cat-grid">
        {premium
          ? allCategories.filter((c) => FAMILY_KEYS.has(c.key)).map(tile)
          : FAMILY_LOCKED.map((f) => (
              <button key={f.key} type="button" className="tile dim" onClick={() => navigate('/premium')}>
                <span className="tile-icon" aria-hidden>
                  {f.emoji}
                </span>
                <span className="tile-label">{f.title}</span>
                <span className="tile-hint">플러스 전용</span>
              </button>
            ))}
        {/* 가족 연동은 무료 */}
        <button type="button" className="tile" onClick={() => setLinkOpen(true)}>
          <span className="tile-icon" aria-hidden>
            🔗
          </span>
          <span className="tile-label">가족과 연동하기</span>
          <span className="tile-hint">무료</span>
        </button>
      </div>

      <h2 className="grid-head">
        좋아하는 사람 숫자 <span className="plus-badge">플러스</span>
      </h2>
      <div className="cat-grid">
        {favoriteCat ? (
          <>
            {tile(favoriteCat)}
            <button type="button" className="tile dim" onClick={() => navigate('/favorites')}>
              <span className="tile-icon" aria-hidden>
                ＋
              </span>
              <span className="tile-label">사람 바꾸기</span>
            </button>
          </>
        ) : (
          <button type="button" className="tile dim" onClick={() => navigate(premium ? '/favorites' : '/premium')}>
            <span className="tile-icon" aria-hidden>
              💖
            </span>
            <span className="tile-label">연예인·위인과 궁합</span>
            <span className="tile-hint">{premium ? '추가하기' : '플러스 전용'}</span>
          </button>
        )}
      </div>

      {linkOpen ? <FamilyLinkWizard onClose={() => setLinkOpen(false)} /> : null}

      <p className="notice" style={{ marginTop: 24 }}>숫자는 무작위로 정해지고 어떤 숫자든 확률은 같아요. 재미로 봐주세요.</p>

      {open ? (
        <div className="sheet-backdrop" onClick={() => setOpenKey(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={open.title}>
            <div className="sheet-head">
              <span className="sheet-emoji" aria-hidden>
                {open.emoji}
              </span>
              <div style={{ flex: 1 }}>
                <h2 className="sheet-title">{open.title}</h2>
                <span className="dim small">{open.tag}</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setOpenKey(null)} aria-label="닫기">
                ×
              </button>
            </div>

            {open.isDream ? (
              <div className="dreams" role="group" aria-label="간밤에 꾼 꿈">
                {DREAMS.map((d) => (
                  <button key={d.key} type="button" aria-pressed={d.key === todayDream} onClick={() => setTodayDream(d.key as DreamKey)}>
                    {d.label}
                  </button>
                ))}
              </div>
            ) : null}

            {open.empty ? (
              <div className="preview-box">
                <Body dim>정보를 넣으면 이 숫자를 볼 수 있어요.</Body>
              </div>
            ) : (
              <div className="sheet-number">
                <LottoBall n={open.nums[0]} size={72} />
              </div>
            )}

            <Body>{open.story}</Body>

            <div className="stack" style={{ marginTop: 4 }}>
              {open.empty ? (
                open.key === 'compat' ? (
                  <Button label="가족·친구 추가" onPress={() => navigate('/profile')} />
                ) : (
                  <Button label="정보 넣기" onPress={() => navigate(`/profile?id=${encodeURIComponent(activeProfile.id)}`)} />
                )
              ) : (
                <>
                  <Button
                    label={
                      pickedNums.includes(open.nums[0])
                        ? '이미 담았어요'
                        : pickedNums.length >= MAX_DAILY_PICKS
                          ? '오늘의 숫자가 이미 다 찼어요'
                          : '오늘의 숫자에 담기'
                    }
                    onPress={() => {
                      togglePicked(open.nums[0]);
                      setOpenKey(null);
                      toast.show('오늘의 숫자에 담았어요');
                    }}
                    disabled={pickedNums.includes(open.nums[0]) || pickedNums.length >= MAX_DAILY_PICKS}
                  />
                  <Button label="번호 복사" kind="secondary" onPress={() => onCopy(open.title, open.nums)} />

                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {pickerOpen ? (
        <div className="sheet-backdrop" onClick={() => setPickerOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="숫자 직접 고르기">
            <div className="sheet-head">
              <div style={{ flex: 1 }}>
                <h2 className="sheet-title">숫자 직접 고르기</h2>
                <span className="dim small">
                  {pickedNums.length}/{MAX_DAILY_PICKS}개 담았어요
                </span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setPickerOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <NumberPicker
              selected={pickedNums}
              onToggle={togglePicked}
              disabled={
                pickedNums.length >= MAX_DAILY_PICKS
                  ? Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => !pickedNums.includes(n))
                  : []
              }
            />
          </div>
        </div>
      ) : null}
      {toast.node}
    </Screen>
  );
}
