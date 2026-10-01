import { useMemo, useState } from 'react';
import { Body, Button } from './ui';
import { NewPersonForm, WizardSheet } from './Wizard';
import { BallRow } from './LottoBall';
import { REL_CHOICES, REL_INFO, analyzePair, type FamilyRel } from '../lib/compatDetail';
import { saveRelation } from '../lib/relations';
import { computeChart } from '../lib/saju';
import type { Profile } from '../lib/types';
import { useApp } from '../state/AppState';

/** 고른 관계: 이름 칸을 미리 채울 값 */
const PREFILL: Partial<Record<FamilyRel, string>> = { mother: '엄마', father: '아빠' };

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
  const [rel, setRel] = useState<FamilyRel | null>(null);
  const [added, setAdded] = useState<Profile | null>(null);

  const preview = useMemo(() => {
    if (!added || !activeProfile || added.id === activeProfile.id) return null;
    try {
      return analyzePair(
        { id: activeProfile.id, name: activeProfile.name, chart: computeChart(activeProfile) },
        { id: added.id, name: added.name, chart: computeChart(added) },
        rel,
      );
    } catch {
      return null;
    }
  }, [added, activeProfile, rel]);

  const restart = () => {
    setAdded(null);
    setRel(null);
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
            {REL_CHOICES.map((r) => (
              <button
                key={r}
                type="button"
                className="choice"
                onClick={() => {
                  setRel(r);
                  setStep('person');
                }}
              >
                <span className="choice-emoji" aria-hidden>
                  {REL_INFO[r].emoji}
                </span>
                <span className="choice-main">
                  <span className="choice-title">{REL_INFO[r].label}</span>
                </span>
                <span className="choice-arrow">›</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {step === 'person' ? (
        <NewPersonForm
          key={rel ?? ''}
          initialName={(rel && PREFILL[rel]) || ''}
          submitLabel="궁합 보기"
          onClose={onClose}
          onDone={(p) => {
            upsertProfile(p);
            // 관계는 '지금 보는 사람 → 새 사람'으로 저장한다
            if (activeProfile && rel) saveRelation(activeProfile.id, p.id, rel);
            setAdded(p);
            setStep('done');
          }}
        />
      ) : null}

      {step === 'done' && added ? (
        <div className="stack">
          {preview && activeProfile ? (
            <div className="pair-card">
              <strong>
                {activeProfile.name} ↔ {added.name}
              </strong>
              <div className="score-row" style={{ marginTop: 8 }}>
                <div className="score-bar" aria-hidden>
                  <span style={{ width: `${preview.score}%` }} />
                </div>
                <span className="score-num">{preview.score}점</span>
              </div>
              <span className="score-grade">{preview.grade}</span>
              <Body small style={{ margin: '8px 0 0' }}>
                {preview.flowText} {rel ? preview.roleTip : ''}
              </Body>
              <div className="num-pair" style={{ marginTop: 10 }}>
                <div>
                  <span className="num-pair-label good">함께하면 좋은 숫자</span>
                  <BallRow numbers={preview.goodNumbers} size={28} />
                </div>
                <div>
                  <span className="num-pair-label avoid">피하면 좋은 숫자</span>
                  <div className="balls-avoid">
                    <BallRow numbers={preview.avoidNumbers} size={28} />
                  </div>
                </div>
              </div>
            </div>
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
