import { useState } from 'react';
import { BallRow } from './LottoBall';
import { Body, Button } from './ui';
import { ErrorText, NewPersonForm, WizardSheet, digits } from './Wizard';
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

type Step = 'who' | 'person' | 'kind' | 'date' | 'done';

const TITLES: Record<Step, string> = {
  who: '누구의 기념일인가요?',
  person: '새 가족을 알려 주세요',
  kind: '어떤 날인가요?',
  date: '날짜는 언제인가요?',
  done: '기념일을 추가했어요',
};

const filled = (p: Profile) => (p.familyEvents ?? []).filter((e) => e.month && e.day);

/**
 * 가족 기념일 추가 팝업: 누구(또는 가족 추가) → 어떤 날 → 언제 → 완료, 한 화면에 질문 하나씩.
 * 새 가족은 첫 기념일과 함께 한 번에 저장한다. 따로 저장하면 서버 id를 받기 전에 기념일 수정이 나가서 꼬일 수 있다.
 */
export function AnniversaryWizard({ onClose }: { onClose: () => void }) {
  const { profiles, upsertProfile } = useApp();
  const [step, setStep] = useState<Step>(profiles.length ? 'who' : 'person');
  const [personId, setPersonId] = useState<string | null>(null);
  const [draftPerson, setDraftPerson] = useState<Profile | null>(null);
  const [label, setLabel] = useState('');
  const [custom, setCustom] = useState(false);
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [error, setError] = useState('');

  const person = draftPerson ?? profiles.find((p) => p.id === personId) ?? null;
  const m = Number(month);
  const d = Number(day);

  const flow: Step[] = step === 'person' || draftPerson ? ['person', 'kind', 'date'] : ['who', 'kind', 'date'];
  const back: Partial<Record<Step, Step>> = { person: profiles.length ? 'who' : undefined, kind: draftPerson ? 'person' : 'who', date: 'kind' };
  const prev = back[step];

  const go = (s: Step) => {
    setError('');
    setStep(s);
  };

  const pickPerson = (p: Profile) => {
    setDraftPerson(null);
    setPersonId(p.id);
    go('kind');
  };

  const pickKind = (k: (typeof KINDS)[number]) => {
    if (k.label === '직접 입력') {
      setCustom(true);
      setLabel('');
      return;
    }
    setCustom(false);
    setLabel(k.label);
    // 생일은 그 사람의 양력 생일로 채워 둔다(음력 생일은 해마다 양력 날짜가 바뀌어 비워 둠)
    if (k.label === '생일' && person?.calendar === 'solar') {
      setMonth(String(person.month));
      setDay(String(person.day));
    }
    go('date');
  };

  const saveEvent = () => {
    // 2월 29일도 받는다(윤년 기준으로 날짜 범위를 본다)
    const valid = m >= 1 && m <= 12 && d >= 1 && d <= new Date(2024, m, 0).getDate();
    if (!person || !valid) {
      setError('날짜를 다시 확인해 주세요.');
      return;
    }
    upsertProfile({ ...person, familyEvents: [...filled(person), { label: label.trim(), month: m, day: d }].slice(0, MAX_EVENTS_PER_PERSON) });
    if (draftPerson) {
      setPersonId(draftPerson.id);
      setDraftPerson(null);
    }
    go('done');
  };

  const restart = () => {
    setPersonId(null);
    setDraftPerson(null);
    setLabel('');
    setCustom(false);
    setMonth('');
    setDay('');
    go('who');
  };

  return (
    <WizardSheet
      label="가족 기념일 추가"
      title={TITLES[step]}
      stepIndex={step === 'done' ? undefined : flow.indexOf(step)}
      stepCount={flow.length}
      onBack={prev ? () => go(prev) : undefined}
      onClose={onClose}
    >
      {step === 'who' ? (
        <>
          <Body dim small style={{ margin: 0 }}>
            생일·결혼기념일처럼 소중한 날을 넣으면 그 날짜로 번호를 만들어 드려요.
          </Body>
          <div className="choices">
            <button type="button" className="choice" onClick={() => go('person')}>
              <span className="choice-emoji" aria-hidden>
                ➕
              </span>
              <span className="choice-main">
                <span className="choice-title">가족 추가하기</span>
                <span className="choice-tag">목록에 없는 가족의 기념일을 넣어요</span>
              </span>
              <span className="choice-arrow">›</span>
            </button>
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

      {step === 'person' ? (
        <NewPersonForm
          initial={draftPerson}
          onClose={onClose}
          onDone={(p) => {
            setDraftPerson(p);
            setPersonId(null);
            go('kind');
          }}
        />
      ) : null}

      {step === 'kind' ? (
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
              <Button label="다음" onPress={() => go('date')} disabled={!label.trim()} />
            </div>
          ) : null}
        </>
      ) : null}

      {step === 'date' && person ? (
        <div className="stack">
          <Body dim small style={{ margin: 0 }}>
            {person.name} 님의 {label} · 매년 돌아오는 날짜(양력)를 넣어 주세요.
          </Body>
          <div className="row">
            <input className="input" value={month} onChange={(e) => setMonth(digits(e.target.value))} placeholder="월" inputMode="numeric" maxLength={2} aria-label="월" autoFocus style={{ flex: 1 }} />
            <input className="input" value={day} onChange={(e) => setDay(digits(e.target.value))} placeholder="일" inputMode="numeric" maxLength={2} aria-label="일" style={{ flex: 1 }} />
          </div>
          <ErrorText text={error} />
          <Button label="추가하기" onPress={saveEvent} disabled={!month || !day} />
        </div>
      ) : null}

      {step === 'done' && person ? (
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
            <Button label="하나 더 추가하기" kind="secondary" onPress={restart} />
          </div>
        </div>
      ) : null}
    </WizardSheet>
  );
}
