import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Header, Screen, Segmented, Switch, useGoBack } from '../components/ui';
import { BLOOD_TYPES, type BloodType } from '../lib/luckyNumbers';
import { newId } from '../lib/random';
import { BirthDateError, toSolar } from '../lib/saju';
import type { FamilyEvent, Profile as ProfileT } from '../lib/types';
import { useApp } from '../state/AppState';

const EMPTY_EVENT: FamilyEvent = { label: '', month: 0, day: 0 };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, placeholder, maxLength, flex = 1 }: { value: string; onChange: (v: string) => void; placeholder: string; maxLength: number; flex?: number }) {
  return (
    <input
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      placeholder={placeholder}
      inputMode="numeric"
      maxLength={maxLength}
      style={{ flex }}
      aria-label={placeholder}
    />
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const goBack = useGoBack('/settings');
  const [params] = useSearchParams();
  const id = params.get('id');
  const { profiles, upsertProfile, deleteProfile, setActiveProfile } = useApp();
  const existing = profiles.find((p) => p.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [calendar, setCalendar] = useState<ProfileT['calendar']>(existing?.calendar ?? 'solar');
  const [leapMonth, setLeapMonth] = useState(existing?.leapMonth ?? false);
  const [year, setYear] = useState(existing ? String(existing.year) : '');
  const [month, setMonth] = useState(existing ? String(existing.month) : '');
  const [day, setDay] = useState(existing ? String(existing.day) : '');
  const [knowsTime, setKnowsTime] = useState(existing ? existing.hour !== null : true);
  const [hour, setHour] = useState(existing?.hour != null ? String(existing.hour) : '');
  const [minute, setMinute] = useState(existing?.hour != null ? String(existing.minute) : '');
  const [bloodType, setBloodType] = useState<BloodType | null>(existing?.bloodType ?? null);
  const [events, setEvents] = useState<FamilyEvent[]>([existing?.familyEvents?.[0] ?? EMPTY_EVENT, existing?.familyEvents?.[1] ?? EMPTY_EVENT]);
  const updateEvent = (i: number, patch: Partial<FamilyEvent>) =>
    setEvents((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const draft = useMemo(
    () => ({
      calendar,
      leapMonth: calendar === 'lunar' && leapMonth,
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: knowsTime ? Number(hour || NaN) : null,
      minute: knowsTime ? Number(minute || 0) : 0,
    }),
    [calendar, leapMonth, year, month, day, knowsTime, hour, minute],
  );

  const preview = useMemo(() => {
    if (year.length !== 4 || !month || !day) return null;
    if (knowsTime && hour === '') return null;
    try {
      const s = toSolar(draft);
      return { ok: true as const, text: calendar === 'lunar' ? `양력 ${s.toYmd()}` : `확인됨 ${s.toYmd()}` };
    } catch (e) {
      return { ok: false as const, text: e instanceof BirthDateError ? e.message : '날짜를 다시 확인해 주세요.' };
    }
  }, [draft, year, month, day, hour, knowsTime, calendar]);

  const onSave = () => {
    if (!name.trim()) return window.alert('이름을 입력해 주세요.\n같은 생일이라도 이름에 따라 번호 조합이 달라져요.');
    if (!preview?.ok) return window.alert(`날짜를 확인해 주세요.\n${preview?.text ?? '생년월일을 모두 입력해 주세요.'}`);
    const isFirst = profiles.length === 0;
    const profile: ProfileT = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      ...draft,
      bloodType,
      familyEvents: events.map((e) => ({ ...e, label: e.label.trim() })),
      createdAt: existing?.createdAt ?? Date.now(),
    };
    upsertProfile(profile);
    if (!existing) setActiveProfile(profile.id);
    if (isFirst) navigate('/', { replace: true });
    else goBack();
  };

  const onDelete = () => {
    if (!existing) return;
    if (profiles.length === 1) return window.alert('마지막 사람은 지울 수 없어요.\n다른 사람을 먼저 추가한 뒤 지워 주세요.');
    if (window.confirm(`${existing.name}님을 지울까요?\n저장한 번호는 번호함에 그대로 남아요.`)) {
      deleteProfile(existing.id);
      goBack();
    }
  };

  return (
    <>
      <Header title="태어난 날 입력" fallback={profiles.length ? '/settings' : '/welcome'} />
      <Screen>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <Field label="이름">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" maxLength={20} aria-label="이름" />
          </Field>

          <Field label="달력">
            <Segmented
              value={calendar}
              onChange={setCalendar}
              options={[
                { value: 'solar', label: '양력' },
                { value: 'lunar', label: '음력' },
              ]}
            />
            {calendar === 'lunar' ? (
              <div className="switch-row">
                <span>윤달에 태어났어요</span>
                <Switch value={leapMonth} onChange={setLeapMonth} label="윤달에 태어났어요" />
              </div>
            ) : null}
          </Field>

          <Field label="생년월일">
            <div className="row">
              <NumInput value={year} onChange={setYear} placeholder="1990" maxLength={4} flex={1.4} />
              <NumInput value={month} onChange={setMonth} placeholder="월" maxLength={2} />
              <NumInput value={day} onChange={setDay} placeholder="일" maxLength={2} />
            </div>
          </Field>

          <Field label="태어난 시간">
            <div className="switch-row" style={{ marginTop: 0 }}>
              <span>시간을 알아요</span>
              <Switch value={knowsTime} onChange={setKnowsTime} label="시간을 알아요" />
            </div>
            {knowsTime ? (
              <div className="row" style={{ marginTop: 12 }}>
                <NumInput value={hour} onChange={setHour} placeholder="시 (0~23)" maxLength={2} />
                <NumInput value={minute} onChange={setMinute} placeholder="분" maxLength={2} />
              </div>
            ) : (
              <p className="faint small" style={{ margin: '8px 0 0' }}>
                시간을 몰라도 괜찮아요. 태어난 시간 두 글자만 빼고 계산해요.
              </p>
            )}
          </Field>

          <Field label="혈액형 (선택)">
            <div className="segment" role="radiogroup" aria-label="혈액형">
              {BLOOD_TYPES.map((b) => (
                <button key={b} type="button" role="radio" aria-checked={bloodType === b} className={bloodType === b ? 'on' : ''} onClick={() => setBloodType(bloodType === b ? null : b)}>
                  {b}형
                </button>
              ))}
            </div>
            <p className="faint small" style={{ margin: '8px 0 0' }}>
              넣으면 오늘의 행운 숫자에 혈액형 숫자가 하나 더 생겨요.
            </p>
          </Field>

          <Field label="가족 기념일 (선택)">
            {events.map((e, i) => (
              <div className="row" key={i} style={{ marginBottom: i === 0 ? 8 : 0 }}>
                <input
                  className="input"
                  style={{ flex: 1.6 }}
                  value={e.label}
                  onChange={(ev) => updateEvent(i, { label: ev.target.value })}
                  placeholder={i === 0 ? '예: 손주 생일' : '예: 결혼기념일'}
                  maxLength={16}
                  aria-label={`${i + 1}번째 기념일 이름`}
                />
                <NumInput value={e.month ? String(e.month) : ''} onChange={(v) => updateEvent(i, { month: Number(v) || 0 })} placeholder="월" maxLength={2} />
                <NumInput value={e.day ? String(e.day) : ''} onChange={(v) => updateEvent(i, { day: Number(v) || 0 })} placeholder="일" maxLength={2} />
              </div>
            ))}
            <p className="faint small" style={{ margin: '8px 0 0' }}>
              넣지 않으셔도 괜찮아요.
            </p>
          </Field>

          {preview ? (
            <p style={{ color: preview.ok ? 'var(--gold)' : 'var(--danger)', fontSize: 14, margin: 0 }} role="status">
              {preview.text}
            </p>
          ) : null}

          <div className="stack" style={{ marginTop: 16 }}>
            <button type="submit" className="btn primary">
              {existing ? '변경 내용 저장' : '저장하고 번호 보기'}
            </button>
            {existing ? <Button label="이 사람 지우기" kind="danger" onPress={onDelete} /> : null}
          </div>
        </form>
      </Screen>
    </>
  );
}
