import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Body, Button, Header, Screen } from '../components/ui';
import { ErrorText, NewPersonForm, WizardSheet } from '../components/Wizard';
import { ApiError, api, type ApiInvitePreview, type ApiPerson } from '../lib/api';
import { setPendingJoin } from '../lib/familyLink';
import { profileToPersonInput, useApp } from '../state/AppState';
import { useAuth } from '../state/AuthState';

type Step = 'loading' | 'confirm' | 'me' | 'newMe' | 'import' | 'done' | 'problem';

const TITLES: Record<Step, string> = {
  loading: '초대를 확인하고 있어요',
  confirm: '가족 그룹에 참여할까요?',
  me: '나는 누구인가요?',
  newMe: '내 정보를 알려 주세요',
  import: '원래 쓰던 정보도 가져올까요?',
  done: '가족과 연동했어요',
  problem: '초대를 열 수 없어요',
};

const STEP_INDEX: Partial<Record<Step, number>> = { confirm: 0, me: 1, newMe: 1, import: 2 };

/**
 * 초대 링크(#/join/코드)로 들어오는 참여 화면.
 * 확인 → 참여 → 나는 누구인지 고르기(또는 새로 넣기) → 원래 쓰던 정보 가져오기 → 완료.
 * 로그인 전이면 코드를 기억해 두고 로그인 화면으로 보낸다(로그인하면 App의 PendingJoin이 다시 이리로 보냄).
 */
export default function Join() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { account, token, households, setCurrentHousehold, reloadHouseholds } = useAuth();
  const { reload, setActiveProfile } = useApp();
  const [step, setStep] = useState<Step>('loading');
  const [preview, setPreview] = useState<ApiInvitePreview | null>(null);
  const [problem, setProblem] = useState('');
  const [joined, setJoined] = useState<{ id: string; name: string } | null>(null);
  const [persons, setPersons] = useState<ApiPerson[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [myPersonId, setMyPersonId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!account || !token) {
      setPendingJoin(code);
      return;
    }
    setPendingJoin(null);
    let alive = true;
    api
      .invitePreview(code, token)
      .then((p) => {
        if (!alive) return;
        setPreview(p);
        if (p.alreadyMember) {
          setProblem(`이미 참여한 "${p.householdName}" 가족 그룹이에요.`);
          setStep('problem');
        } else if (p.status !== 'active') {
          setProblem(p.status === 'used' ? '이미 사용한 초대예요. 그룹을 만든 분에게 새 초대 링크를 받아 주세요.' : '기간이 지난 초대예요. 그룹을 만든 분에게 새 초대 링크를 받아 주세요.');
          setStep('problem');
        } else {
          setStep('confirm');
        }
      })
      .catch((e) => {
        if (!alive) return;
        setProblem(e instanceof ApiError ? e.message : '초대를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
        setStep('problem');
      });
    return () => {
      alive = false;
    };
  }, [account, token, code]);

  if (!account || !token) return <Navigate to="/login" replace />;

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

  // 내가 만든 다른 그룹 중 사람이 등록된 곳(원래 쓰던 정보)
  const myOldGroups = households.filter((h) => h.role === 'owner' && h.id !== joined?.id && (h.persons?.length ?? 0) > 0);

  const afterMe = () => setStep(myOldGroups.length ? 'import' : 'done');

  const join = () =>
    run(async () => {
      const res = await api.joinHousehold(code, token);
      setJoined({ id: res.id, name: res.name });
      await reloadHouseholds();
      const list = await api.listPersons(res.id, token);
      setPersons(list);
      setPicked(res.invitedPersonId ?? null);
      setStep(list.length ? 'me' : 'newMe');
    });

  const linkPicked = () =>
    run(async () => {
      if (!joined || !picked) return;
      await api.linkPerson(joined.id, picked, token);
      setMyPersonId(picked);
      afterMe();
    });

  const finish = async () => {
    if (joined) {
      setCurrentHousehold(joined.id);
      await reload();
      if (myPersonId) setActiveProfile(myPersonId);
    }
    navigate('/', { replace: true });
  };

  const goBack: Partial<Record<Step, () => void>> = {
    newMe: persons.length ? () => setStep('me') : undefined,
  };

  return (
    <>
      <Header title="가족 그룹 참여" fallback="/" />
      <Screen>
        <Body dim>초대받은 가족 그룹에 참여하는 중이에요.</Body>
      </Screen>
      <WizardSheet
        label="가족 그룹 참여"
        title={TITLES[step]}
        stepIndex={STEP_INDEX[step]}
        stepCount={3}
        onBack={goBack[step]}
        onClose={() => navigate('/', { replace: true })}
      >
        {step === 'loading' ? <span className="spinner" aria-label="불러오는 중" /> : null}

        {step === 'problem' ? (
          <div className="stack">
            <Body small style={{ margin: 0 }}>
              {problem}
            </Body>
            {preview?.alreadyMember ? (
              <Button
                label="이 그룹으로 보기"
                onPress={() => {
                  setCurrentHousehold(preview.householdId);
                  navigate('/', { replace: true });
                }}
              />
            ) : null}
            <Button label="홈으로" kind={preview?.alreadyMember ? 'secondary' : 'primary'} onPress={() => navigate('/', { replace: true })} />
          </div>
        ) : null}

        {step === 'confirm' && preview ? (
          <div className="stack">
            <div className="benefit-list">
              <div className="benefit-row">
                <span aria-hidden>🏠</span>
                <span>
                  <strong>{preview.householdName}</strong>
                  <br />
                  <span className="dim small">{preview.ownerName} 님이 만든 가족 그룹</span>
                </span>
              </div>
              {preview.personName ? (
                <div className="benefit-row">
                  <span aria-hidden>💌</span>
                  <span>{preview.personName} 님으로 초대받았어요</span>
                </div>
              ) : null}
            </div>
            <Body dim small style={{ margin: 0 }}>
              참여하면 이 그룹의 가족 목록·기념일·번호함을 함께 봐요. 원래 쓰던 정보는 그대로 남아 있어요.
            </Body>
            <ErrorText text={error} />
            <Button label={busy ? '참여하는 중…' : '참여하기'} onPress={join} disabled={busy} />
            <Button label="나중에 할게요" kind="secondary" onPress={() => navigate('/', { replace: true })} />
          </div>
        ) : null}

        {step === 'me' ? (
          <div className="stack">
            <Body dim small style={{ margin: 0 }}>
              이 그룹에 등록된 사람 중 본인을 골라 주세요. 연동하면 내 휴대폰에서 내 사주가 바로 열려요.
            </Body>
            <div className="choices" role="radiogroup" aria-label="나는 누구인가요">
              {persons.map((p) => {
                const taken = Boolean(p.linkedAccountId && p.linkedAccountId !== account.id);
                const on = picked === p.id;
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={on} className={on ? 'choice on' : 'choice'} disabled={taken || busy} onClick={() => setPicked(p.id)}>
                    <span className="choice-main">
                      <span className="choice-title">{p.name}</span>
                      <span className="choice-tag">
                        {p.calendar === 'lunar' ? '음력' : '양력'} {p.birthYear}.{p.birthMonth}.{p.birthDay}
                      </span>
                    </span>
                    <span className={taken ? 'choice-hint' : 'choice-arrow'}>{taken ? '다른 분과 연동됨' : on ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
            <ErrorText text={error} />
            <Button label="이 사람이 나예요" onPress={linkPicked} disabled={!picked || busy} />
            <Button label="목록에 없어요" kind="secondary" onPress={() => setStep('newMe')} disabled={busy} />
            <button type="button" className="text-btn" style={{ alignSelf: 'center' }} onClick={afterMe}>
              나중에 할게요
            </button>
          </div>
        ) : null}

        {step === 'newMe' && joined ? (
          <>
            <NewPersonForm
              initialName={account.displayName}
              submitLabel={busy ? '저장하는 중…' : '추가하고 연동하기'}
              checkLimit={false}
              onClose={() => navigate('/', { replace: true })}
              onDone={(p) =>
                run(async () => {
                  const created = await api.createPerson(joined.id, profileToPersonInput(p), token);
                  await api.linkPerson(joined.id, created.id, token);
                  setMyPersonId(created.id);
                  afterMe();
                })
              }
            />
            <ErrorText text={error} />
          </>
        ) : null}

        {step === 'import' && joined ? (
          <div className="stack">
            <Body dim small style={{ margin: 0 }}>
              내가 만든 그룹에 등록해 둔 가족과 저장한 번호를 "{joined.name}" 그룹으로 복사할 수 있어요. 이름·생년월일이 같은 사람은 한 명으로 합쳐요. 원래 그룹은 그대로 남아요.
            </Body>
            <div className="choices">
              {myOldGroups.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="choice"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const r = await api.importHousehold(joined.id, h.id, token);
                      setImportResult(`"${h.name}"에서 ${r.persons}명${r.merged ? `(같은 사람 ${r.merged}명은 합침)` : ''}, 번호 ${r.tickets}개를 가져왔어요.`);
                      setStep('done');
                    })
                  }
                >
                  <span className="choice-main">
                    <span className="choice-title">{h.name}</span>
                    <span className="choice-tag">등록한 사람 {h.persons?.length ?? 0}명 · 저장한 번호 포함</span>
                  </span>
                  <span className="choice-action">가져오기</span>
                </button>
              ))}
            </div>
            <ErrorText text={error} />
            <Button label="따로 둘게요" kind="secondary" onPress={() => setStep('done')} disabled={busy} />
          </div>
        ) : null}

        {step === 'done' && joined ? (
          <div className="stack" style={{ textAlign: 'center' }}>
            <Body style={{ margin: 0 }}>"{joined.name}" 가족 그룹에 참여했어요.</Body>
            {importResult ? (
              <Body dim small style={{ margin: 0 }}>
                {importResult}
              </Body>
            ) : null}
            <Body dim small style={{ margin: 0 }}>
              다른 그룹으로 바꾸려면 설정 &gt; 가족과 연동하기에서 고르면 돼요.
            </Body>
            <Button label="시작하기" onPress={finish} />
          </div>
        ) : null}
      </WizardSheet>
    </>
  );
}
