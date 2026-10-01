import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Body, Button, Screen } from '../components/ui';
import { afterAuthPath, getPendingJoin } from '../lib/familyLink';
import { useAuth } from '../state/AuthState';

export default function Login() {
  const navigate = useNavigate();
  const { account, login, loading, error, clearError } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  if (account) return <Navigate to="/" replace />;

  const submit = async () => {
    // 갈 곳은 로그인 전에 정해 둔다(로그인 직후 참여 화면이 초대 코드 기억을 지우기 때문)
    const next = afterAuthPath('/');
    if (await login(loginId.trim(), password)) navigate(next, { replace: true });
  };

  return (
    <Screen>
      <div style={{ margin: '48px 0 40px' }}>
        <img src="/logo-mark-144.png" alt="하루 한수" width={72} height={72} style={{ display: 'block', marginBottom: 12 }} />
        <p className="welcome-mark">하루 한수</p>
        {getPendingJoin() ? (
          <Body small style={{ marginTop: 12, color: 'var(--gold)' }}>
            가족 그룹 초대를 받으셨어요. 로그인하거나 가입하면 바로 참여 화면으로 이어져요.
          </Body>
        ) : null}
      </div>

      <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
        <input
          className="input"
          value={loginId}
          onChange={(e) => {
            setLoginId(e.target.value);
            clearError();
          }}
          placeholder="아이디"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          aria-label="아이디"
        />
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearError();
          }}
          placeholder="비밀번호"
          autoComplete="current-password"
          aria-label="비밀번호"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && loginId.trim() && password) void submit();
          }}
        />
      </div>
      {error ? (
        <Body small style={{ color: 'var(--danger)', marginBottom: 12 }}>
          {error}
        </Body>
      ) : null}
      <Button label={loading ? '로그인 중…' : '로그인'} onPress={submit} disabled={loading || !loginId.trim() || !password} />

      <div className="signup-cta">
        <span className="dim small">아직 계정이 없으신가요?</span>
        <Button label="회원가입" kind="secondary" onPress={() => navigate('/signup')} />
      </div>
    </Screen>
  );
}
