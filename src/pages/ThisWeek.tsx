import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdSenseBanner } from '../components/Ads';
import { BallRow, LottoBall } from '../components/LottoBall';
import { NumberPicker } from '../components/NumberPicker';
import { Body, Button, Screen, useToast } from '../components/ui';
import { DREAMS, type DreamKey } from '../lib/luckyNumbers';
import { newId } from '../lib/random';
import { upcomingRound } from '../lib/rounds';
import { MAX_DAILY_PICKS, useDailyPicks, useTodayCategories } from '../lib/todayNumbers';
import { useApp } from '../state/AppState';

export default function ThisWeek() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profiles, activeProfile, activeChart, addTicket, hasTicket, todayDream, setTodayDream } = useApp();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { now, categories: allCategories } = useTodayCategories();
  const { picks: pickedNums, toggle: togglePicked, clear: clearPicked } = useDailyPicks();
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const onSaveDailyPick = () => {
    if (pickedNums.length !== MAX_DAILY_PICKS) return;
    onSaveTicket(pickedNums, 'today-pick');
    clearPicked();
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
      <p className="meta" style={{ marginBottom: 4 }}>
        {activeProfile.name}님, 오늘의 숫자를 알려 드려요
      </p>
      <h1 className="home-date">{`${now.getMonth() + 1}월 ${now.getDate()}일`}</h1>

      <div className="chips" style={{ marginTop: 14 }}>
        <span className="chip on">{activeChart.animal}띠</span>
        {activeProfile.bloodType ? <span className="chip on">{activeProfile.bloodType}형</span> : null}
      </div>

      <div className="hero-main" style={{ cursor: 'default', border: 'none' }}>
        <span className="dim small">오늘의 숫자 추가하기</span>
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
          <div className="row">
            <div style={{ flex: 1 }}>
              <Button label="직접 추가" kind="secondary" onPress={() => setPickerOpen(true)} />
            </div>
            {pickedNums.length ? (
              <div style={{ flex: 1 }}>
                <Button label="초기화" kind="secondary" onPress={clearPicked} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AdSenseBanner />

      <p className="dim small" style={{ margin: '16px 0' }}>그림을 눌러 숫자를 확인해요</p>

      <div className="cat-grid">
        {allCategories.map((c) => (
          <button key={c.key} type="button" className={c.empty ? 'tile dim' : 'tile'} onClick={() => setOpenKey(c.key)}>
            <span className="tile-icon" aria-hidden>
              {c.emoji}
            </span>
            <span className="tile-label">{c.title}</span>
            {c.empty ? <span className="tile-hint">정보 필요</span> : null}
          </button>
        ))}
      </div>

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
