import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Body, Button, Segmented } from './ui';
import { newId } from '../lib/random';
import { BirthDateError, toSolar } from '../lib/saju';
import type { Profile } from '../lib/types';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import { FREE_PERSON_LIMIT, useBilling } from '../state/BillingState';

/** 화면 가운데 뜨는 단계형 팝업 틀: 진행 막대·제목·이전·닫기 */
export function WizardSheet({
  label,
  title,
  stepIndex,
  stepCount,
  onBack,
  onClose,
  children,
}: {
  label: string;
  title: string;
  /** 진행 막대 위치(0부터). 없으면 막대를 숨김(완료 화면 등) */
  stepIndex?: number;
  stepCount?: number;
  onBack?: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="sheet-backdrop sheet-center" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-head">
          {onBack ? (
            <button type="button" className="icon-btn" onClick={onBack} aria-label="이전">
              ‹
            </button>
          ) : null}
          <div style={{ flex: 1 }}>
            {stepIndex !== undefined && stepCount ? (
              <div className="wizard-steps" aria-label={`${stepIndex + 1}/${stepCount}단계`}>
                {Array.from({ length: stepCount }, (_, i) => (
                  <span key={i} className={i <= stepIndex ? 'on' : ''} />
                ))}
              </div>
            ) : null}
            <h2 className="sheet-title">{title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const digits = (v: string) => v.replace(/[^0-9]/g, '');

export function ErrorText({ text }: { text: string }) {
  return text ? (
    <p className="small" style={{ color: 'var(--danger)', margin: 0 }} role="alert">
      {text}
    </p>
  ) : null;
}

/** 무료 가족 그룹 인원 한도에 걸렸는지. 그룹을 만든 사람의 구독으로 판단한다(Profile 화면과 같은 규칙) */
export function useFamilyLimitReached() {
  const { profiles } = useApp();
  const { households, currentHouseholdId } = useAuth();
  const { premium, status: billing } = useBilling();
  const group = households.find((h) => h.id === currentHouseholdId);
  const groupPlus = Boolean(group?.plus) || (group?.role === 'owner' && premium);
  return Boolean(billing?.enabled) && !groupPlus && profiles.length >= FREE_PERSON_LIMIT;
}

/**
 * 새 가족 입력(이름·양음력·생년월일). 저장은 하지 않고 만든 Profile을 onDone으로 넘긴다.
 * 태어난 시간·혈액형은 나중에 설정에서 넣을 수 있다.
 */
export function NewPersonForm({
  initial,
  initialName = '',
  submitLabel = '다음',
  onDone,
  onClose,
}: {
  /** 이전 단계로 돌아왔을 때 다시 채울 값 */
  initial?: Profile | null;
  initialName?: string;
  submitLabel?: string;
  onDone: (p: Profile) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const atLimit = useFamilyLimitReached();
  const [name, setName] = useState(initial?.name ?? initialName);
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>(initial?.calendar ?? 'solar');
  const [year, setYear] = useState(initial ? String(initial.year) : '');
  const [month, setMonth] = useState(initial ? String(initial.month) : '');
  const [day, setDay] = useState(initial ? String(initial.day) : '');
  const [error, setError] = useState('');

  if (atLimit && !initial) {
    return (
      <div className="stack">
        <Body dim small style={{ margin: 0 }}>
          무료 가족 그룹은 {FREE_PERSON_LIMIT}명까지 등록할 수 있어요. 가족 그룹을 만든 분이 하루 한수 플러스를 이용하면 인원 제한이 풀려요.
        </Body>
        <Button
          label="하루 한수 플러스 알아보기"
          onPress={() => {
            onClose();
            navigate('/premium');
          }}
        />
      </div>
    );
  }

  const submit = () => {
    const base = { calendar, leapMonth: false, year: Number(year), month: Number(month), day: Number(day), hour: null, minute: 0 };
    try {
      toSolar(base);
    } catch (e) {
      setError(e instanceof BirthDateError ? e.message : '생년월일을 다시 확인해 주세요.');
      return;
    }
    setError('');
    onDone({ id: initial?.id ?? newId(), name: name.trim(), ...base, bloodType: null, gender: null, familyEvents: [], createdAt: Date.now() });
  };

  return (
    <div className="stack">
      <Body dim small style={{ margin: 0 }}>
        이름과 생년월일만 있으면 돼요. 태어난 시간·혈액형은 나중에 설정에서 넣을 수 있어요.
      </Body>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 엄마)" maxLength={20} aria-label="이름" autoFocus />
      <Segmented
        value={calendar}
        onChange={setCalendar}
        options={[
          { value: 'solar', label: '양력' },
          { value: 'lunar', label: '음력' },
        ]}
      />
      <div className="row">
        <input className="input" value={year} onChange={(e) => setYear(digits(e.target.value))} placeholder="1965" inputMode="numeric" maxLength={4} aria-label="태어난 해" style={{ flex: 1.4 }} />
        <input className="input" value={month} onChange={(e) => setMonth(digits(e.target.value))} placeholder="월" inputMode="numeric" maxLength={2} aria-label="태어난 달" style={{ flex: 1 }} />
        <input className="input" value={day} onChange={(e) => setDay(digits(e.target.value))} placeholder="일" inputMode="numeric" maxLength={2} aria-label="태어난 날" style={{ flex: 1 }} />
      </div>
      <ErrorText text={error} />
      <Button label={submitLabel} onPress={submit} disabled={!name.trim() || year.length !== 4 || !month || !day} />
    </div>
  );
}
