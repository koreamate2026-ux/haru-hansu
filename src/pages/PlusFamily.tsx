import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnniversaryWizard } from '../components/AnniversaryWizard';
import { BallRow } from '../components/LottoBall';
import { PlusOnly, TodayNumberCard } from '../components/PlusDetail';
import { Body, Button, Header, Screen, Section } from '../components/ui';
import { upcomingEvents } from '../lib/plusDetail';
import { useTodayCategories } from '../lib/todayNumbers';
import { useApp } from '../state/AppState';

export default function PlusFamily() {
  return (
    <PlusOnly>
      <FamilyBody />
    </PlusOnly>
  );
}

function FamilyBody() {
  const navigate = useNavigate();
  const { profiles, upsertProfile } = useApp();
  const { categories } = useTodayCategories();
  const cat = categories?.find((c) => c.key === 'family') ?? null;
  const events = useMemo(() => upcomingEvents(profiles), [profiles]);
  const next = events[0];
  // 기념일이 하나도 없으면 들어오자마자 추가 팝업을 띄운다
  const [wizard, setWizard] = useState(() => events.length === 0 && profiles.length > 0);

  const removeEvent = (personId: string, index: number, label: string) => {
    const p = profiles.find((x) => x.id === personId);
    if (!p || !window.confirm(`${p.name} 님의 ${label}을(를) 지울까요?`)) return;
    upsertProfile({ ...p, familyEvents: p.familyEvents.filter((_, i) => i !== index) });
  };

  return (
    <>
      <Header title="가족 기념일" fallback="/" />
      <Screen>
        {cat && !cat.empty ? <TodayNumberCard category={cat} /> : null}

        {events.length === 0 ? (
          <>
            <Body dim style={{ marginBottom: 20 }}>
              아직 등록한 가족 기념일이 없어요. 생일·결혼기념일처럼 소중한 날을 넣으면 그 날짜로 번호를 만들어 드려요.
            </Body>
            {profiles.length ? (
              <Button label="기념일 추가하기" onPress={() => setWizard(true)} />
            ) : (
              <Button label="사람 먼저 추가하기" onPress={() => navigate('/profile')} />
            )}
          </>
        ) : (
          <>
            {next ? (
              <div className="card plus-today" style={{ marginTop: cat && !cat.empty ? 0 : undefined }}>
                <span className="dim small">가장 가까운 기념일</span>
                <h2 className="fortune-title" style={{ margin: '6px 0 2px' }}>
                  {next.label}
                </h2>
                <Body dim small>
                  {next.personName} 님 · {next.month}월 {next.day}일 · {next.daysLeft === 0 ? '오늘이에요!' : `${next.daysLeft}일 남았어요`}
                </Body>
              </div>
            ) : null}

            <Section title="다가오는 기념일">
              <div className="stack" style={{ gap: 0 }}>
                {events.map((e) => (
                  <div key={`${e.personId}-${e.index}`} className="luck">
                    <div className="luck-top">
                      <strong>{e.label}</strong>
                      <span className="dim small">
                        {e.personName} · {e.month}월 {e.day}일
                      </span>
                      <span className="dday">{e.daysLeft === 0 ? 'D-DAY' : `D-${e.daysLeft}`}</span>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <BallRow numbers={e.numbers} size={30} />
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="faint small">월·일·두 수를 더한 값에서 나온 번호예요</span>
                      <button type="button" className="text-btn" onClick={() => removeEvent(e.personId, e.index, e.label)}>
                        지우기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
            <Button label="기념일 추가하기" kind="secondary" onPress={() => setWizard(true)} />
            <p className="notice" style={{ marginTop: 12 }}>
              기념일은 사람마다 두 개까지 넣을 수 있어요.
            </p>
          </>
        )}
      </Screen>
      {wizard ? <AnniversaryWizard onClose={() => setWizard(false)} /> : null}
    </>
  );
}
