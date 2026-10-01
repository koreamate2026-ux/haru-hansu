import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Body, Button, Screen } from '../components/ui';
import { afterAuthPath, getPendingJoin } from '../lib/familyLink';
import { useAuth } from '../state/AuthState';

export default function Login() {
  const navigate = useNavigate();
  const { account, login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (account) return <Navigate to="/" replace />;

  const submit = async () => {
    // 갈 곳은 로그인 전에 정해 둔다(로그인 직후 참여 화면이 초대 코드 기억을 지우기 때문)
    const next = afterAuthPath('/');
    if (await login(email.trim(), password)) navigate(next, { replace: true });
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
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearError();
          }}
          placeholder="이메일"
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="이메일"
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
          aria-label="비밀번호"
        />
      </div>
      {error ? (
        <Body small style={{ color: 'var(--danger)', marginBottom: 12 }}>
          {error}
        </Body>
      ) : null}
      <Button label={loading ? '로그인 중…' : '로그인'} onPress={submit} disabled={loading || !email.trim() || !password} />

      <button
        type="button"
        className="link"
        style={{ display: 'block', textAlign: 'center', width: '100%', marginTop: 20 }}
        onClick={() => navigate('/signup')}
      >
        계정이 없으신가요? 휴대폰 인증으로 가입하기
      </button>
    </Screen>
  );
}
