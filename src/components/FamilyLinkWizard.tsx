import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Body, Button } from './ui';
import { ErrorText, WizardSheet } from './Wizard';
import { ApiError, api } from '../lib/api';
import { copyText, inviteMessage, inviteUrl } from '../lib/familyLink';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthState';

type Step = 'intro' | 'who' | 'share';

const TITLES: Record<Step, string> = {
  intro: '가족과 연동하기',
  who: '누구를 초대할까요?',
  share: '초대 링크를 보내 주세요',
};

const BENEFITS = [
  { emoji: '👨‍👩‍👧', text: '가족 목록과 기념일을 함께 봐요' },
  { emoji: '🗂️', text: '번호함을 함께 쓰고, 가족이 저장한 번호도 보여요' },
  { emoji: '📱', text: '가족 휴대폰에서는 자기 사주가 바로 열려요' },
];

/**
 * 가족 초대 팝업: 연동하면 좋은 점 → 누구를 초대할지 → 링크 복사.
 * 초대는 그룹을 만든 사람만 보낼 수 있다. 구성원에게는 그 안내와 다른 그룹 초대 코드 입력만 보여 준다.
 */
export function FamilyLinkWizard({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { token, households, currentHouseholdId } = useAuth();
  const { profiles } = useApp();
  const group = households.find((h) => h.id === currentHouseholdId) ?? null;
  const isOwner = group?.role === 'owner';
  const [step, setStep] = useState<Step>('intro');
  const [invite, setInvite] = useState<{ code: string; personName: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const flow: Step[] = ['intro', 'who', 'share'];
  const back: Partial<Record<Step, Step>> = { who: 'intro' };

  const makeInvite = async (personId: string | null, personName: string | null) => {
    if (!token || !group) return;
    setBusy(true);
    setError('');
    try {
      const created = await api.createInvite(group.id, personId, token);
      setInvite({ code: created.code, personName });
      setCopied('');
      setStep('share');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '초대 링크를 만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (what: 'message' | 'link') => {
    if (!invite || !group) return;
    const text = what === 'message' ? inviteMessage(invite.code, group.name, invite.personName) : inviteUrl(invite.code);
    const ok = await copyText(text);
    setCopied(ok ? (what === 'message' ? '초대 문구를 복사했어요. 카톡이나 문자에 붙여 넣어 보내 주세요.' : '링크를 복사했어요.') : '복사하지 못했어요. 아래 링크를 길게 눌러 복사해 주세요.');
  };

  return (
    <WizardSheet
      label="가족과 연동하기"
      title={TITLES[step]}
      stepIndex={isOwner ? flow.indexOf(step) : undefined}
      stepCount={flow.length}
      onBack={back[step] ? () => setStep(back[step]!) : undefined}
      onClose={onClose}
    >
      {!group ? (
        <div className="stack">
          <Body dim small style={{ margin: 0 }}>
            가족 그룹을 먼저 만들어야 초대할 수 있어요.
          </Body>
          <Button
            label="설정에서 가족 그룹 만들기"
            onPress={() => {
              onClose();
              navigate('/settings');
            }}
          />
        </div>
      ) : step === 'intro' ? (
        <>
          <div className="benefit-list">
            {BENEFITS.map((b) => (
              <div key={b.text} className="benefit-row">
                <span aria-hidden>{b.emoji}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>
          {isOwner ? (
            <Button label="가족 초대하기" onPress={() => setStep('who')} />
          ) : (
            <div className="stack">
              <Body dim small style={{ margin: 0 }}>
                지금 쓰는 "{group.name}" 그룹의 초대는 그룹을 만든 분만 보낼 수 있어요. 다른 가족 그룹의 초대 코드를 받았다면 아래에 넣어 주세요.
              </Body>
              <div className="row">
                <input
                  className="input"
                  style={{ flex: 1, textTransform: 'uppercase' }}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="초대 코드 6자리"
                  maxLength={10}
                  aria-label="초대 코드"
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
                <Button
                  label="참여"
                  kind="secondary"
                  disabled={joinCode.trim().length < 6}
                  onPress={() => {
                    onClose();
                    navigate(`/join/${encodeURIComponent(joinCode.trim().toUpperCase())}`);
                  }}
                />
              </div>
            </div>
          )}
        </>
      ) : step === 'who' ? (
        <>
          <Body dim small style={{ margin: 0 }}>
            이미 등록한 가족을 고르면, 그분이 참여할 때 그 정보와 바로 연결돼요.
          </Body>
          <div className="choices">
            {profiles.map((p) => {
              const linked = Boolean(p.linkedAccountId);
              return (
                <button key={p.id} type="button" className="choice" disabled={linked || busy} onClick={() => makeInvite(p.id, p.name)}>
                  <span className="choice-main">
                    <span className="choice-title">{p.name}</span>
                    <span className="choice-tag">
                      {p.calendar === 'lunar' ? '음력' : '양력'} {p.year}.{p.month}.{p.day}
                    </span>
                  </span>
                  <span className={linked ? 'choice-hint' : 'choice-arrow'}>{linked ? '연동됨' : '›'}</span>
                </button>
              );
            })}
            <button type="button" className="choice" disabled={busy} onClick={() => makeInvite(null, null)}>
              <span className="choice-emoji" aria-hidden>
                ➕
              </span>
              <span className="choice-main">
                <span className="choice-title">목록에 없는 사람</span>
                <span className="choice-tag">참여하면서 본인 정보를 직접 넣어요</span>
              </span>
              <span className="choice-arrow">›</span>
            </button>
          </div>
          <ErrorText text={error} />
        </>
      ) : step === 'share' && invite ? (
        <div className="stack">
          <Body dim small style={{ margin: 0 }}>
            {invite.personName ? `${invite.personName} 님에게` : '가족에게'} 링크를 보내 주세요. 링크를 누르면 바로 참여 화면이 열려요. 7일 안에 한 번만 쓸 수 있어요.
          </Body>
          <div className="invite-box">
            <span className="dim small">초대 코드</span>
            <span className="invite-code">{invite.code}</span>
            <span className="faint small invite-link">{inviteUrl(invite.code)}</span>
          </div>
          <Button label="초대 문구 복사하기" onPress={() => copy('message')} />
          <Button label="링크만 복사하기" kind="secondary" onPress={() => copy('link')} />
          {copied ? (
            <p className="small" style={{ color: 'var(--gold)', margin: 0 }} role="status">
              {copied}
            </p>
          ) : null}
          <Body dim small style={{ margin: 0 }}>
            보낸 초대는 설정 &gt; 가족 구성원에서 확인하고 취소할 수 있어요.
          </Body>
          <Button label="완료" kind="secondary" onPress={onClose} />
        </div>
      ) : null}
    </WizardSheet>
  );
}
