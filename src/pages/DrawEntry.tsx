import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { BallRow } from '../components/LottoBall';
import { NumberPicker } from '../components/NumberPicker';
import { Body, Button, Header, Screen, useGoBack } from '../components/ui';
import { drawDate, isDrawn } from '../lib/rounds';
import { useApp } from '../state/AppState';

export default function DrawEntry() {
  const goBack = useGoBack('/tickets');
  const round = Number(useParams().round);
  const { saveManualDraw } = useApp();
  const [main, setMain] = useState<number[]>([]);
  const [bonus, setBonus] = useState<number | null>(null);
  const choosingBonus = main.length === 6;

  if (!Number.isInteger(round) || round < 1 || !isDrawn(round)) return <Navigate to="/tickets" replace />;

  const toggle = (n: number) => {
    if (main.includes(n)) {
      setMain(main.filter((x) => x !== n));
      setBonus(null);
      return;
    }
    if (!choosingBonus) setMain([...main, n].sort((a, b) => a - b));
    else setBonus(bonus === n ? null : n);
  };

  const onSave = () => {
    const d = drawDate(round);
    saveManualDraw({ round, date: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`, numbers: main, bonus: bonus!, source: 'manual' });
    goBack();
  };

  return (
    <>
      <Header title="당첨번호 입력" fallback="/tickets" />
      <Screen>
        <h2 className="display" style={{ fontSize: 24, margin: '0 0 8px' }}>
          제{round}회 당첨번호
        </h2>
        <Body dim style={{ marginBottom: 16 }}>
          {choosingBonus ? '이제 보너스 번호 1개를 골라 주세요.' : '당첨번호 6개를 먼저 골라 주세요. 동행복권 홈페이지나 판매점에서 확인할 수 있어요.'}
        </Body>
        <div className="preview-box" style={{ minHeight: 44, marginBottom: 16 }}>
          {main.length ? <BallRow numbers={main} bonus={bonus ?? undefined} size={34} /> : null}
        </div>
        <NumberPicker selected={bonus ? [...main, bonus] : main} onToggle={toggle} />
        <div style={{ marginTop: 24 }}>
          <Button label="결과 저장" onPress={onSave} disabled={main.length !== 6 || bonus === null} />
        </div>
      </Screen>
    </>
  );
}
