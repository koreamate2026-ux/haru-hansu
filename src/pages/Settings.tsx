import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Body, Button, Screen, Section, Segmented, Title } from '../components/ui';
import { DEFAULT_DRAW_API } from '../lib/draws';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthState';

function FamilySync() {
  const { account, households, loading, error, signup, login, logout, createHousehold, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [householdName, setHouseholdName] = useState('');

  if (account) {
    return (
      <Section title="가족과 연동하기">
        <Body small style={{ marginBottom: 8 }}>
          {account.email}로 로그인했어요.
        </Body>
        {households.length ? (
          <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
            {households.map((h) => (
              <div key={h.id} className="person">
                <div className="person-main">
                  <div className="person-name">{h.name}</div>
                  <div className="person-detail">{h.role === 'owner' ? '내가 만든 그룹' : '초대받은 그룹'}</div>
                </div>
              </div>
            ))}
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
          지금은 계정을 만들면 가족 그룹을 함께 만들 수 있어요. 사람·번호 자체를 서버와 동기화하는 기능은 준비 중이에요.
        </Body>
      </Section>
    );
  }

  const submit = async () => {
    const ok = mode === 'login' ? await login(email.trim(), password) : await signup(email.trim(), password, displayName.trim());
    if (ok) {
      setPassword('');
    }
  };

  return (
    <Section title="가족과 연동하기">
      <Body dim small style={{ marginBottom: 12 }}>
        계정을 만들면 여러 기기에서 같은 가족 그룹을 볼 수 있어요. 만들지 않아도 이 브라우저에서는 지금처럼 계속 쓸 수 있어요.
      </Body>
      <div style={{ marginBottom: 12 }}>
        <Segmented
          value={mode}
          onChange={(v) => {
            setMode(v);
            clearError();
          }}
          options={[
            { value: 'login', label: '로그인' },
            { value: 'signup', label: '계정 만들기' },
          ]}
        />
      </div>
      <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
        {mode === 'signup' ? (
          <input
            className="input small-text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="이름"
            maxLength={20}
            aria-label="이름"
          />
        ) : null}
        <input
          className="input small-text"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="이메일"
        />
        <input
          className="input small-text"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (8자 이상)"
          aria-label="비밀번호"
        />
      </div>
      {error ? (
        <Body small style={{ color: 'var(--danger)', marginBottom: 12 }}>
          {error}
        </Body>
      ) : null}
      <Button
        label={loading ? '처리 중…' : mode === 'login' ? '로그인' : '계정 만들기'}
        onPress={submit}
        disabled={loading || !email.trim() || !password || (mode === 'signup' && !displayName.trim())}
      />
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
      navigate('/welcome', { replace: true });
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

      <FamilySync />

      <Section title="정보">
        <button type="button" className="list-row" onClick={() => navigate('/about')}>
          번호를 고르는 방법
        </button>
        <Body dim small style={{ marginTop: 8 }}>
          입력한 생년월일과 저장한 번호는 이 브라우저에만 저장되고 어디에도 전송되지 않아요. 당첨번호를 조회할 때만 회차 번호가 조회 주소로 전송돼요. 위에서 계정을 만들면 그 이메일·이름·가족 그룹 이름만 서버로 전송돼요.
        </Body>
      </Section>

      <Button label="모든 정보 지우기" kind="danger" onPress={onReset} />
    </Screen>
  );
}
