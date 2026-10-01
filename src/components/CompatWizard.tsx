import { useMemo, useState } from 'react';
import { Body, Button } from './ui';
import { NewPersonForm, WizardSheet } from './Wizard';
import { pairText, relationBetween, zodiacMatch } from '../lib/plusDetail';
import { computeChart } from '../lib/saju';
import { REL_NAME } from '../lib/sajuDetail';
import type { Profile } from '../lib/types';
import { useApp } from '../state/AppState';

const RELATIONS = [
  { emoji: '👩', label: '엄마', name: '엄마' },
  { emoji: '👨', label: '아빠', name: '아빠' },
  { emoji: '💑', label: '배우자·연인', name: '' },
  { emoji: '👶', label: '자녀', name: '' },
  { emoji: '👫', label: '형제·자매', name: '' },
  { emoji: '🙌', label: '친구', name: '' },
  { emoji: '✏️', label: '그 밖의 사람', name: '' },
] as const;

type Step = 'who' | 'person' | 'done';

const TITLES: Record<Step, string> = {
  who: '누구와 궁합을 볼까요?',
  person: '그분을 알려 주세요',
  done: '궁합을 확인했어요',
};

/** 가족 궁합 시작 팝업: 어떤 사이 → 이름·생년월일 → 나와의 궁합 미리보기. 새 가족은 바로 저장한다 */
export function CompatWizard({ onClose }: { onClose: () => void }) {
  const { profiles, activeProfile, upsertProfile } = useApp();
  const [step, setStep] = useState<Step>('who');
  const [initialName, setInitialName] = useState('');
  const [added, setAdded] = useState<Profile | null>(null);

  const preview = useMemo(() => {
    if (!added || !activeProfile || added.id === activeProfile.id) return null;
    try {
      const mine = computeChart(activeProfile);
      const theirs = computeChart(added);
      return { rel: relationBetween(mine, theirs), z: zodiacMatch(mine, theirs) };
    } catch {
      return null;
    }
  }, [added, activeProfile]);

  const restart = () => {
    setAdded(null);
    setInitialName('');
    setStep('who');
  };

  return (
    <WizardSheet
      label="가족 궁합 시작하기"
      title={TITLES[step]}
      stepIndex={step === 'done' ? undefined : step === 'who' ? 0 : 1}
      stepCount={2}
      onBack={step === 'person' ? () => setStep('who') : undefined}
      onClose={onClose}
    >
      {step === 'who' ? (
        <>
          <Body dim small style={{ margin: 0 }}>
            {profiles.length < 2
              ? '가족 궁합은 두 사람 이상의 사주를 함께 봐요. 함께 볼 사람을 한 명 더 알려 주세요.'
              : '함께 볼 사람을 더 넣으면 가족 전체의 궁합 숫자가 달라져요.'}
          </Body>
          <div className="choices">
            {RELATIONS.map((r) => (
              <button
                key={r.label}
                type="button"
                className="choice"
                onClick={() => {
                  setInitialName(r.name);
                  setStep('person');
                }}
              >
                <span className="choice-emoji" aria-hidden>
                  {r.emoji}
                </span>
                <span className="choice-main">
                  <span className="choice-title">{r.label}</span>
                </span>
                <span className="choice-arrow">›</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {step === 'person' ? (
        <NewPersonForm
          key={initialName}
          initialName={initialName}
          submitLabel="궁합 보기"
          onClose={onClose}
          onDone={(p) => {
            upsertProfile(p);
            setAdded(p);
            setStep('done');
          }}
        />
      ) : null}

      {step === 'done' && added ? (
        <div className="stack">
          {preview && activeProfile ? (
            <>
              <div className="luck">
                <div className="luck-top">
                  <strong>
                    {activeProfile.name} ↔ {added.name}
                  </strong>
                  <span className="dim small">{REL_NAME[preview.rel]}</span>
                </div>
                <Body small>{pairText(activeProfile.name, added.name, preview.rel)}</Body>
                <Body dim small style={{ marginTop: 6 }}>
                  {preview.z.label} · {preview.z.text}
                </Body>
              </div>
            </>
          ) : (
            <Body small style={{ margin: 0 }}>
              {added.name} 님을 가족에 추가했어요.
            </Body>
          )}
          <Body dim small style={{ margin: 0 }}>
            이제 가족 모두의 사주를 합친 오늘의 궁합 숫자를 볼 수 있어요.
          </Body>
          <div className="stack" style={{ marginTop: 4 }}>
            <Button label="가족 궁합 숫자 보기" onPress={onClose} />
            <Button label="한 명 더 추가하기" kind="secondary" onPress={restart} />
          </div>
        </div>
      ) : null}
    </WizardSheet>
  );
}
