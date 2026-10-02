import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Body, Button } from './ui';
import { ErrorText, NewPersonForm, WizardSheet } from './Wizard';
import { ApiError, api } from '../lib/api';
import { profileToPersonInput, useApp } from '../state/AppState';
import { useAuth } from '../state/AuthState';

/** 이번에 앱을 연 동안 '나중에'를 고른 그룹(다음에 앱을 열면 다시 묻는다) */
const dismissed = new Set<string>();

/** 이 화면들에서는 띄우지 않는다(로그인·가입·참여 화면은 각자 흐름이 있음) */
const SKIP = ['/login', '/signup', '/join', '/welcome'];

/**
 * 가족 그룹을 쓰는 사람에게 처음 한 번: (아직 연동 안 했으면) 나는 누구인지 고르고,
 * 내 사주를 가족과 함께 볼지 정한다. 공유하지 않으면 다른 가족 화면에는 내 정보가 가지 않는다.
 */
export function SajuShareGate() {
  const { pathname } = useLocation();
  const { account, token, currentHouseholdId } = useAuth();
  const { profiles, synced, serverLoaded, reload, setActiveProfile } = useApp();
  const [step, setStep] = useState<'who' | 'newMe' | 'share'>('who');
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [, force] = useState(0);

  if (!account || !token || !currentHouseholdId || !synced || !serverLoaded) return null;
  if (SKIP.some((p) => pathname.startsWith(p)) || dismissed.has(currentHouseholdId)) return null;
  const me = profiles.find((p) => p.linkedAccountId === account.id) ?? null;
  if (me && me.shareSaju !== null && me.shareSaju !== undefined) return null;
  // 연동할 사람이 하나도 없으면(빈 그룹) 묻지 않는다
  if (!me && profiles.length === 0) return null;

  const current = me ? 'share' : step === 'share' ? 'who' : step;
  const close = () => {
    dismissed.add(currentHouseholdId);
    force((n) => n + 1);
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const choose = (share: boolean) =>
    run(async () => {
      if (!me) return;
      await api.setSajuShare(currentHouseholdId, me.id, share, token);
      await reload();
    });

  const titles = { who: '이 가족 그룹에서 나는 누구인가요?', newMe: '내 정보를 알려 주세요', share: '내 사주를 가족과 함께 볼까요?' };
  const unlinked = profiles.filter((p) => !p.linkedAccountId);

  return (
    <WizardSheet
      label="사주 공유 설정"
      title={titles[current]}
      stepIndex={me ? undefined : current === 'share' ? 1 : 0}
      stepCount={2}
      onBack={current === 'newMe' ? () => setStep('who') : undefined}
      onClose={close}
    >
      {current === 'who' ? (
        <div className="stack">
          <Body dim small style={{ margin: 0 }}>
            가족 연동이 새로워졌어요. 내가 누구인지 고르면 내 휴대폰에서 내 사주가 바로 열리고, 내 사주를 가족과 함께 볼지 정할 수 있어요.
          </Body>
          <div className="choices" role="radiogroup" aria-label="나는 누구인가요">
            {unlinked.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={picked === p.id} className={picked === p.id ? 'choice on' : 'choice'} onClick={() => setPicked(p.id)} disabled={busy}>
                <span className="choice-main">
                  <span className="choice-title">{p.name}</span>
                  <span className="choice-tag">
                    {p.calendar === 'lunar' ? '음력' : '양력'} {p.year}.{p.month}.{p.day}
                  </span>
                </span>
                <span className="choice-arrow">{picked === p.id ? '✓' : ''}</span>
              </button>
            ))}
          </div>
          <ErrorText text={error} />
          <Button
            label="이 사람이 나예요"
            disabled={!picked || busy}
            onPress={() =>
              run(async () => {
                await api.linkPerson(currentHouseholdId, picked!, token);
                await reload();
                setActiveProfile(picked!);
              })
            }
          />
          <Button label="목록에 없어요" kind="secondary" onPress={() => setStep('newMe')} disabled={busy} />
          <button type="button" className="text-btn" style={{ alignSelf: 'center' }} onClick={close}>
            나중에 할게요
          </button>
        </div>
      ) : null}

      {current === 'newMe' ? (
        <>
          <NewPersonForm
            initialName={account.displayName}
            submitLabel={busy ? '저장하는 중…' : '추가하고 연동하기'}
            onClose={close}
            onDone={(p) =>
              run(async () => {
                const created = await api.createPerson(currentHouseholdId, profileToPersonInput(p), token);
                await api.linkPerson(currentHouseholdId, created.id, token);
                await reload();
                setActiveProfile(created.id);
              })
            }
          />
          <ErrorText text={error} />
        </>
      ) : null}

      {current === 'share' ? <ShareChoice busy={busy} error={error} onChoose={choose} onLater={close} /> : null}
    </WizardSheet>
  );
}

/** 공유할지 고르는 화면(참여 화면에서도 같이 쓴다) */
export function ShareChoice({ busy, error, onChoose, onLater }: { busy: boolean; error: string; onChoose: (share: boolean) => void; onLater?: () => void }) {
  return (
    <div className="stack">
      <div className="benefit-list">
        <div className="benefit-row">
          <span aria-hidden>👨‍👩‍👧</span>
          <span>
            <strong>공유하면</strong> 가족이 내 생년월일·태어난 시간으로 가족 궁합, 가족 숫자, 기념일을 함께 볼 수 있어요.
          </span>
        </div>
        <div className="benefit-row">
          <span aria-hidden>🔒</span>
          <span>
            <strong>나만 보기</strong>를 고르면 다른 가족의 화면에는 내 정보가 보이지 않아요.
          </span>
        </div>
      </div>
      <Body dim small style={{ margin: 0 }}>
        설정에서 언제든 바꿀 수 있어요.
      </Body>
      <ErrorText text={error} />
      <Button label="가족과 공유할게요" onPress={() => onChoose(true)} disabled={busy} />
      <Button label="나만 볼게요" kind="secondary" onPress={() => onChoose(false)} disabled={busy} />
      {onLater ? (
        <button type="button" className="text-btn" style={{ alignSelf: 'center' }} onClick={onLater}>
          나중에 정할게요
        </button>
      ) : null}
    </div>
  );
}
