import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Body, Button, Screen, Section, Title } from '../components/ui';
import { FamilyLinkWizard } from '../components/FamilyLinkWizard';
import { ApiError, api, type ApiInvite, type ApiMember } from '../lib/api';
import { copyText, inviteMessage, inviteUrl } from '../lib/familyLink';
import { DEFAULT_DRAW_API } from '../lib/draws';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import { BusinessInfo } from './Legal';
import { useBilling } from '../state/BillingState';

/** 이 화면은 로그인해야만 들어올 수 있어서(App.tsx의 로그인 게이트) account는 항상 있다 */
function FamilySync() {
  const { account, households, currentHouseholdId, setCurrentHousehold, loading, error, logout, createHousehold } = useAuth();
  const { synced } = useApp();
  const [householdName, setHouseholdName] = useState('');

  return (
    <Section title="가족과 연동하기">
      <Body small style={{ marginBottom: 8 }}>
        {account?.email}로 로그인했어요.
      </Body>
      {households.length ? (
        <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
          {households.map((h) => {
            const on = h.id === currentHouseholdId;
            return (
              <button
                key={h.id}
                type="button"
                className="person"
                style={{ borderColor: on ? 'var(--gold)' : 'transparent', textAlign: 'left' }}
                onClick={() => setCurrentHousehold(h.id)}
                aria-pressed={on}
              >
                <div className="person-main" style={{ pointerEvents: 'none' }}>
                  <div className="person-name">
                    {h.name}
                    {on ? <span className="dim"> · 지금 쓰는 중</span> : null}
                  </div>
                  <div className="person-detail">{h.role === 'owner' ? '내가 만든 그룹' : '초대받은 그룹'}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Body dim small style={{ marginBottom: 12 }}>
          아직 만든 가족 그룹이 없어요.
        </Body>
      )}
      <div className="row" style={{ marginBottom: 12 }}>
        <input
          className="input small-text"
          style={{ flex: 1 }}
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          placeholder="예: 우리 가족"
          maxLength={30}
          aria-label="가족 그룹 이름"
        />
        <Button
          label="만들기"
          kind="secondary"
          disabled={loading || !householdName.trim()}
          onPress={async () => {
            if (await createHousehold(householdName.trim())) setHouseholdName('');
          }}
        />
      </div>
      {error ? (
        <Body small style={{ color: 'var(--danger)', marginBottom: 12 }}>
          {error}
        </Body>
      ) : null}
      <Button label="로그아웃" kind="secondary" onPress={logout} />
      <Body dim small style={{ marginTop: 8 }}>
        {synced
          ? '지금 고른 가족 그룹과 사람·번호함이 서로 맞춰지고 있어요. 이 기기에서 추가·수정·삭제하면 서버에도 그대로 반영돼요.'
          : '가족 그룹을 고르면 그때부터 사람·번호함이 서버와 맞춰져요.'}
      </Body>
    </Section>
  );
}

function FamilyMembers() {
  const navigate = useNavigate();
  const { token, households, currentHouseholdId, reloadHouseholds } = useAuth();
  const { reload } = useApp();
  const group = households.find((h) => h.id === currentHouseholdId);
  const isOwner = group?.role === 'owner';
  const [members, setMembers] = useState<ApiMember[] | null>(null);
  const [invites, setInvites] = useState<ApiInvite[]>([]);
  const [wizard, setWizard] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadMembers = useCallback(async () => {
    if (!token || !currentHouseholdId) {
      setMembers(null);
      setInvites([]);
      return;
    }
    try {
      setMembers(await api.householdMembers(currentHouseholdId, token));
    } catch {
      setMembers(null);
    }
    try {
      setInvites(isOwner ? await api.listInvites(currentHouseholdId, token) : []);
    } catch {
      setInvites([]);
    }
  }, [token, currentHouseholdId, isOwner]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  if (!token) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : '처리하지 못했어요.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = (m: ApiMember) => {
    const leaving = m.isMe;
    const question = leaving ? '이 가족 그룹에서 나갈까요?\n다시 들어오려면 새 초대가 필요해요.' : `${m.displayName}님을 이 가족 그룹에서 내보낼까요?\n등록된 정보와 번호는 그룹에 남아요.`;
    if (!currentHouseholdId || !window.confirm(question)) return;
    void run(async () => {
      await api.removeMember(currentHouseholdId, m.accountId, token);
      if (leaving) {
        await reloadHouseholds();
        setMsg({ ok: true, text: '가족 그룹에서 나왔어요.' });
      } else {
        await loadMembers();
        await reload();
      }
    });
  };

  const unlink = (m: ApiMember) => {
    if (!currentHouseholdId || !m.linkedPersonId) return;
    if (!window.confirm(`${m.displayName}님과 "${m.linkedPersonName}"의 연동을 풀까요?`)) return;
    void run(async () => {
      await api.unlinkPerson(currentHouseholdId, m.linkedPersonId!, token);
      await loadMembers();
      await reload();
    });
  };

  const copyInvite = async (inv: ApiInvite) => {
    if (!group) return;
    const ok = await copyText(inviteMessage(inv.code, group.name, inv.personName));
    setMsg({ ok, text: ok ? '초대 문구를 복사했어요. 카톡이나 문자에 붙여 넣어 보내 주세요.' : inviteUrl(inv.code) });
  };

  const cancelInvite = (inv: ApiInvite) => {
    if (!currentHouseholdId || !window.confirm('이 초대를 취소할까요? 보낸 링크로는 더 이상 참여할 수 없어요.')) return;
    void run(async () => {
      await api.cancelInvite(currentHouseholdId, inv.id, token);
      await loadMembers();
    });
  };

  const STATUS: Record<ApiInvite['status'], string> = { active: '참여 전', used: '참여함', expired: '기간 지남' };

  return (
    <Section title="가족 구성원">
      {members ? (
        <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
          {members.map((m) => (
            <div key={m.accountId} className="person">
              <div className="person-main">
                <div className="person-name">
                  {m.displayName}
                  {m.isMe ? <span className="dim"> · 나</span> : null}
                </div>
                <div className="person-detail">
                  {m.role === 'owner' ? '그룹을 만든 분' : '구성원'} · {m.linkedPersonName ? `🔗 ${m.linkedPersonName}` : '연동한 사람 없음'}
                </div>
              </div>
              {m.linkedPersonId && (isOwner || m.isMe) ? (
                <button type="button" className="text-btn" onClick={() => unlink(m)} disabled={busy}>
                  연동 풀기
                </button>
              ) : null}
              {m.role === 'member' && (isOwner || m.isMe) ? (
                <button type="button" className="text-btn" onClick={() => remove(m)} disabled={busy}>
                  {m.isMe ? '나가기' : '내보내기'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {group ? <Button label={isOwner ? '가족 초대하기' : '가족과 연동하기'} kind="secondary" onPress={() => setWizard(true)} /> : null}

      {isOwner && invites.length ? (
        <div style={{ marginTop: 16 }}>
          <h3 className="detail-head">보낸 초대</h3>
          <div className="stack" style={{ gap: 8 }}>
            {invites.map((inv) => (
              <div key={inv.id} className="person">
                <div className="person-main">
                  <div className="person-name">
                    {inv.personName ?? '목록에 없는 사람'} <span className="dim small">· {inv.code}</span>
                  </div>
                  <div className="person-detail">
                    {STATUS[inv.status]}
                    {inv.status === 'used' && inv.usedByName ? ` · ${inv.usedByName}님` : ''}
                    {inv.status === 'active' ? ` · ${new Date(inv.expiresAt).toLocaleDateString('ko-KR')}까지` : ''}
                  </div>
                </div>
                {inv.status === 'active' ? (
                  <>
                    <button type="button" className="text-btn" onClick={() => copyInvite(inv)} disabled={busy}>
                      복사
                    </button>
                    <button type="button" className="text-btn" onClick={() => cancelInvite(inv)} disabled={busy}>
                      취소
                    </button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 16 }}>
        <input
          className="input small-text"
          style={{ flex: 1, textTransform: 'uppercase' }}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="받은 초대 코드 6자리"
          maxLength={10}
          aria-label="초대 코드"
          autoCapitalize="characters"
          autoCorrect="off"
        />
        <Button label="참여하기" kind="secondary" onPress={() => navigate(`/join/${encodeURIComponent(joinCode.trim().toUpperCase())}`)} disabled={joinCode.trim().length < 6} />
      </div>

      {msg ? (
        <Body small style={{ marginTop: 10, color: msg.ok ? 'var(--gold)' : 'var(--danger)', whiteSpace: 'pre-line', wordBreak: 'break-all' }}>
          {msg.text}
        </Body>
      ) : null}

      {wizard ? (
        <FamilyLinkWizard
          onClose={() => {
            setWizard(false);
            void loadMembers();
          }}
        />
      ) : null}
    </Section>
  );
}

function DeleteAccount() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const { resetAll } = useApp();
  const { premium } = useBilling();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) return null;
  if (!open) {
    return (
      <button type="button" className="text-btn" style={{ display: 'block', margin: '20px auto 0', color: 'var(--text-faint)' }} onClick={() => setOpen(true)}>
        회원 탈퇴
      </button>
    );
  }

  const submit = async () => {
    if (!window.confirm('정말 탈퇴할까요? 되돌릴 수 없어요.')) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount(password, token);
      resetAll();
      logout();
      navigate('/login', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '탈퇴하지 못했어요.');
      setBusy(false);
    }
  };

  return (
    <Section title="회원 탈퇴" style={{ marginTop: 28 }}>
      <Body dim small style={{ marginBottom: 12 }}>
        탈퇴하면 계정이 지워지고 되돌릴 수 없어요. 내가 만든 가족 그룹은 다른 구성원이 있으면 가장 먼저 들어온 분에게 넘어가고, 없으면 등록한 사람과 번호함까지 모두 지워져요.
        {premium ? ' 이용 중인 플러스 구독은 탈퇴와 함께 끝나고 남은 기간은 환불되지 않아요. 환불이 필요하면 먼저 구독 관리에서 환불을 요청해 주세요.' : ''}
      </Body>
      <input
        className="input small-text"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호 확인"
        aria-label="비밀번호 확인"
        style={{ marginBottom: 12 }}
      />
      {error ? (
        <Body small style={{ color: 'var(--danger)', marginBottom: 12 }}>
          {error}
        </Body>
      ) : null}
      <div className="stack">
        <Button label={busy ? '처리 중…' : '탈퇴하기'} kind="danger" onPress={submit} disabled={busy || !password} />
        <Button label="취소" kind="secondary" onPress={() => setOpen(false)} disabled={busy} />
      </div>
    </Section>
  );
}

function PlusSection() {
  const navigate = useNavigate();
  const { premium, status } = useBilling();
  const end = status?.currentPeriodEnd ? new Date(status.currentPeriodEnd) : null;
  const endLabel = end ? `${end.getFullYear()}.${end.getMonth() + 1}.${end.getDate()}` : '';
  return (
    <Section title="하루 한수 플러스">
      <Body dim small style={{ marginBottom: 12 }}>
        {premium
          ? status?.cancelAtPeriodEnd
            ? `이용 중이에요. ${endLabel}까지 이용하고 해지돼요.`
            : `이용 중이에요. 다음 결제일은 ${endLabel}이에요.`
          : status?.enabled
            ? '월 1,900원으로 광고 없이, 자세한 사주 풀이와 번호 기록 분석까지. 내가 만든 가족 그룹은 인원 제한도 없어요.'
            : '광고 없이 쓰는 월 1,900원 구독을 준비하고 있어요.'}
      </Body>
      <Button label={premium ? '구독 관리' : '플러스 알아보기'} kind={premium ? 'secondary' : 'primary'} onPress={() => navigate('/premium')} />
    </Section>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { profiles, activeProfile, setActiveProfile, settings, updateSettings, resetAll } = useApp();
  const { account } = useAuth();
  const [apiBase, setApiBase] = useState(settings.drawApiBase);

  const onReset = () => {
    if (window.confirm('모든 정보를 지울까요?\n등록한 사람, 저장한 번호, 설정이 이 브라우저에서 모두 지워져요.')) {
      resetAll();
      navigate('/login', { replace: true });
    }
  };

  return (
    <Screen tabs>
      <Title>설정</Title>

      <Section title="사람">
        <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
          {profiles.map((p) => {
            const on = p.id === activeProfile?.id;
            return (
              <div key={p.id} className="person">
                <button type="button" className="person-main" onClick={() => setActiveProfile(p.id)} aria-pressed={on}>
                  <div className="person-name">
                    {p.name}
                    {on ? <span className="dim">  ·  지금 보는 중</span> : null}
                  </div>
                  <div className="person-detail">
                    {p.calendar === 'lunar' ? '음력' : '양력'} {p.year}.{p.month}.{p.day}
                    {p.hour !== null ? ` ${p.hour}시` : ' 시간 모름'}
                    {p.linkedAccountId ? (p.linkedAccountId === account?.id ? ' · 🔗 나' : ' · 🔗 연동됨') : ''}
                  </div>
                </button>
                <button type="button" className="text-btn" style={{ fontSize: 15 }} onClick={() => navigate(`/profile?id=${encodeURIComponent(p.id)}`)}>
                  수정
                </button>
              </div>
            );
          })}
        </div>
        <Button label="가족·친구 추가" kind="secondary" onPress={() => navigate('/profile')} />
      </Section>

      <Section title="당첨번호 조회 주소">
        <Body dim small style={{ marginBottom: 12 }}>
          비워두면 기본 주소로 조회해요. 조회가 막히면 직접 운영하는 중계 서버 주소를 넣을 수 있어요. 주소 끝에 회차 번호가 붙어요.
        </Body>
        <input
          className="input small-text"
          type="url"
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          onBlur={() => updateSettings({ drawApiBase: apiBase.trim() })}
          placeholder={DEFAULT_DRAW_API}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="당첨번호 조회 주소"
        />
      </Section>

      <PlusSection />

      <FamilySync />

      <FamilyMembers />

      <Section title="정보">
        <button type="button" className="list-row" onClick={() => navigate('/about')}>
          번호를 고르는 방법
        </button>
        <button type="button" className="list-row" onClick={() => navigate('/legal/terms')}>
          이용약관
        </button>
        <button type="button" className="list-row" onClick={() => navigate('/legal/refund')}>
          환불 정책
        </button>
        <button type="button" className="list-row" onClick={() => navigate('/legal/privacy')}>
          개인정보처리방침
        </button>
        <Body dim small style={{ marginTop: 8 }}>
          가족 계정에 로그인해야 사람·번호함을 볼 수 있어요. 이메일·이름·가족 그룹 이름은 서버에 저장되고, 당첨번호를 조회할 때만 회차 번호가 조회 주소로 전송돼요.
        </Body>
      </Section>

      <Button label="모든 정보 지우기" kind="danger" onPress={onReset} />
      <DeleteAccount />
      <BusinessInfo />
    </Screen>
  );
}
