import { useState } from 'react';
import { BallRow } from '../components/LottoBall';
import { NumberPicker } from '../components/NumberPicker';
import { Body, Button, Header, Screen, useGoBack } from '../components/ui';
import { newId } from '../lib/random';
import { drawDate, upcomingRound } from '../lib/rounds';
import { useApp } from '../state/AppState';

export default function TicketNew() {
  const goBack = useGoBack('/tickets');
  const { activeProfile, addTicket } = useApp();
  const [round, setRound] = useState(upcomingRound());
  const [picked, setPicked] = useState<number[]>([]);

  const toggle = (n: number) =>
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < 6 ? [...p, n].sort((a, b) => a - b) : p));

  const onSave = () => {
    addTicket({
      id: newId(),
      profileId: activeProfile?.id ?? null,
      profileName: activeProfile?.name ?? '나',
      round,
      numbers: picked,
      source: 'manual',
      createdAt: Date.now(),
    });
    goBack();
  };

  return (
    <>
      <Header title="번호 직접 저장" fallback="/tickets" />
      <Screen>
        <div className="round-row">
          <button type="button" className="icon-btn" onClick={() => setRound((r) => Math.max(1, r - 1))} aria-label="이전 회차">
            ‹
          </button>
          <div className="round-center">
            <div className="display" style={{ fontSize: 24 }}>
              제{round}회
            </div>
            <div className="faint small">{drawDate(round).label} 추첨</div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setRound((r) => Math.min(upcomingRound(), r + 1))}
            disabled={round >= upcomingRound()}
            aria-label="다음 회차"
          >
            ›
          </button>
        </div>

        <div className="preview-box">{picked.length ? <BallRow numbers={picked} size={36} /> : <Body dim>번호 6개를 골라 주세요.</Body>}</div>

        <NumberPicker selected={picked} onToggle={toggle} />

        <div style={{ marginTop: 24 }}>
          <Button label={picked.length === 6 ? '저장' : `${6 - picked.length}개 더 골라 주세요`} onPress={onSave} disabled={picked.length !== 6} />
        </div>
      </Screen>
    </>
  );
}
