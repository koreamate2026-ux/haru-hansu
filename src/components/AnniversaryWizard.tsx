import { useState } from 'react';
import { BallRow } from './LottoBall';
import { Body, Button } from './ui';
import { eventNumbers } from '../lib/plusDetail';
import type { Profile } from '../lib/types';
import { useApp } from '../state/AppState';

/** 사람마다 넣을 수 있는 기념일 수(서버 제한과 같음) */
export const MAX_EVENTS_PER_PERSON = 2;

const KINDS = [
  { emoji: '🎂', label: '생일' },
  { emoji: '💍', label: '결혼기념일' },
  { emoji: '💕', label: '처음 만난 날' },
  { emoji: '🎓', label: '입학·졸업' },
  { emoji: '✏️', label: '직접 입력' },
] as const;

const filled = (p: Profile) => (p.familyEvents ?? []).filter((e) => e.month && e.day);

/** 가족 기념일 추가 팝업: 누구 → 어떤 날 → 언제 → 완료, 한 화면에 질문 하나씩 */
export function AnniversaryWizard({ onClose }: { onClose: () => void }) {
  const { profiles, upsertProfile } = useApp();
  const [step, setStep] = useState(0);
  const [personId, setPersonId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [custom, setCustom] = useState(false);
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [error, setError] = useState('');

  const person = profiles.find((p) => p.id === personId) ?? null;
  const m = Number(month);
  const d = Number(day);

  const pickPerson = (p: Profile) => {
    setPersonId(p.id);
    setStep(1);
  };

  const pickKind = (k: (typeof KINDS)[number]) => {
    if (k.label === '직접 입력') {
      setCustom(true);
      setLabel('');
      return;
    }
    setCustom(false);
    setLabel(k.label);
    setStep(2);
  };

  const saveEvent = () => {
    // 2월 29일도 받는다(윤년 기준으로 날짜 범위를 본다)
    const valid = m >= 1 && m <= 12 && d >= 1 && d <= new Date(2024, m, 0).getDate();
    if (!person || !valid) {
      setError('날짜를 다시 확인해 주세요.');
      return;
    }
    upsertProfile({ ...person, familyEvents: [...filled(person), { label: label.trim(), month: m, day: d }].slice(0, MAX_EVENTS_PER_PERSON) });
    setError('');
    setStep(3);
  };

  const restart = () => {
    setStep(0);
    setPersonId(null);
    setLabel('');
    setCustom(false);
    setMonth('');
    setDay('');
  };

  const titles = ['누구의 기념일인가요?', '어떤 날인가요?', '날짜는 언제인가요?', '기념일을 추가했어요'];
  const digits = (v: string) => v.replace(/[^0-9]/g, '');

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="가족 기념일 추가">
        <div className="sheet-head">
          {step > 0 && step < 3 ? (
            <button type="button" className="icon-btn" onClick={() => setStep(step - 1)} aria-label="이전">
              ‹
            </button>
          ) : null}
          <div style={{ flex: 1 }}>
            {step < 3 ? (
              <div className="wizard-steps" aria-label={`${step + 1}/3단계`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i <= step ? 'on' : ''} />
                ))}
              </div>
            ) : null}
            <h2 className="sheet-title">{titles[step]}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        {step === 0 ? (
          <>
            <Body dim small style={{ margin: 0 }}>
              생일·결혼기념일처럼 소중한 날을 넣으면 그 날짜로 번호를 만들어 드려요.
            </Body>
            <div className="choices">
              {profiles.map((p) => {
                const full = filled(p).length >= MAX_EVENTS_PER_PERSON;
                return (
                  <button key={p.id} type="button" className="choice" disabled={full} onClick={() => pickPerson(p)}>
                    <span className="choice-main">
                      <span className="choice-title">{p.name}</span>
                      <span className="choice-tag">{filled(p).length ? filled(p).map((e) => e.label || '기념일').join(', ') : '아직 기념일이 없어요'}</span>
                    </span>
                    <span className={full ? 'choice-hint' : 'choice-arrow'}>{full ? `${MAX_EVENTS_PER_PERSON}개 모두 넣음` : '›'}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="choices">
              {KINDS.map((k) => (
                <button key={k.label} type="button" className="choice" onClick={() => pickKind(k)} aria-pressed={k.label === '직접 입력' ? custom : label === k.label}>
                  <span className="choice-emoji" aria-hidden>
                    {k.emoji}
                  </span>
                  <span className="choice-main">
                    <span className="choice-title">{k.label}</span>
                  </span>
                  <span className="choice-arrow">›</span>
                </button>
              ))}
            </div>
            {custom ? (
              <div className="stack">
                <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 손주 백일" maxLength={16} aria-label="기념일 이름" autoFocus />
                <Button label="다음" onPress={() => setStep(2)} disabled={!label.trim()} />
              </div>
            ) : null}
          </>
        ) : null}

        {step === 2 && person ? (
          <div className="stack">
            <Body dim small style={{ margin: 0 }}>
              {person.name} 님의 {label} · 매년 돌아오는 날짜(양력)를 넣어 주세요.
            </Body>
            <div className="row">
              <input className="input" value={month} onChange={(e) => setMonth(digits(e.target.value))} placeholder="월" inputMode="numeric" maxLength={2} aria-label="월" autoFocus style={{ flex: 1 }} />
              <input className="input" value={day} onChange={(e) => setDay(digits(e.target.value))} placeholder="일" inputMode="numeric" maxLength={2} aria-label="일" style={{ flex: 1 }} />
            </div>
            {error ? (
              <p className="small" style={{ color: 'var(--danger)', margin: 0 }} role="alert">
                {error}
              </p>
            ) : null}
            <Button label="추가하기" onPress={saveEvent} disabled={!month || !day} />
          </div>
        ) : null}

        {step === 3 && person ? (
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
            <Body style={{ margin: 0 }}>
              {person.name} 님의 {label} · {m}월 {d}일
            </Body>
            <div className="sheet-number">
              <BallRow numbers={eventNumbers(m, d)} size={40} />
            </div>
            <span className="faint small">월·일·두 수를 더한 값에서 나온 번호예요</span>
            <div className="stack" style={{ width: '100%', marginTop: 8 }}>
              <Button label="완료" onPress={onClose} />
              {profiles.some((p) => filled(p).length < MAX_EVENTS_PER_PERSON) ? <Button label="하나 더 추가하기" kind="secondary" onPress={restart} /> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
