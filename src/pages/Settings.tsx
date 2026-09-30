import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Body, Button, Screen, Section, Title } from '../components/ui';
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
      <BusinessInfo />
    </Screen>
  );
}
