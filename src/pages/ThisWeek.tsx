import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LottoBall } from '../components/LottoBall';
import { Body, Button, Screen, useToast } from '../components/ui';
import { DREAMS, familyCompat, luckyCategories, type DreamKey } from '../lib/luckyNumbers';
import { newId } from '../lib/random';
import { upcomingRound } from '../lib/rounds';
import { useApp } from '../state/AppState';

export default function ThisWeek() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profiles, activeProfile, activeChart, addTicket, hasTicket, todayDream, setTodayDream } = useApp();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [rolls, setRolls] = useState<Record<string, number>>({});
  const [globalRoll, setGlobalRoll] = useState(0);

  const now = useMemo(() => new Date(), []);
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  const categories = useMemo(
    () =>
      activeProfile && activeChart
        ? luckyCategories(activeProfile, activeChart, { dream: todayDream, todayKey, now, rolls, globalRoll })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeProfile, activeChart, todayDream, todayKey, rolls, globalRoll],
  );

  const familyCat = useMemo(
    () => familyCompat(profiles, { todayKey, rolls, globalRoll }),
    [profiles, todayKey, rolls, globalRoll],
  );

  useEffect(() => {
    if (!openKey) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenKey(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openKey]);

  if (!activeProfile || !activeChart || !categories) {
    return (
      <Screen tabs>
        <Body>정보를 불러오지 못했어요. 설정에서 생년월일을 다시 확인해 주세요.</Body>
      </Screen>
    );
  }

  const round = upcomingRound();
  // 오행 숫자 바로 다음에 가족 궁합 숫자를 끼워 넣는다
  const allCategories = [...categories.slice(0, 2), familyCat, ...categories.slice(2)];
  const open = allCategories.find((c) => c.key === openKey) ?? null;

  const onReroll = (key: string) => setRolls((r) => ({ ...r, [key]: (r[key] ?? 0) + 1 }));

  const onSaveTicket = (nums: number[], category: string) => {
    if (hasTicket(round, nums)) return;
    addTicket({
      id: newId(),
      profileId: activeProfile.id,
      profileName: activeProfile.name,
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

      <div className="home-bar">
        <span className="dim small">그림을 눌러 숫자를 확인해요</span>
        <button type="button" className="text-btn" onClick={() => setGlobalRoll((g) => g + 1)}>
          오늘 번호 다시 뽑기
        </button>
      </div>

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
                    label={hasTicket(round, open.nums) ? '번호함에 저장됨' : '번호함에 저장'}
                    onPress={() => onSaveTicket(open.nums, open.key)}
                    disabled={hasTicket(round, open.nums)}
                    kind={hasTicket(round, open.nums) ? 'secondary' : 'primary'}
                  />
                  <div className="row">
                    <div style={{ flex: 1 }}>
                      <Button label="다시 뽑기" kind="secondary" onPress={() => onReroll(open.key)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Button label="번호 복사" kind="secondary" onPress={() => onCopy(open.title, open.nums)} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {toast.node}
    </Screen>
  );
}
