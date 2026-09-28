import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Body, Button, Screen } from '../components/ui';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthState';

export default function Login() {
  const navigate = useNavigate();
  const { profiles } = useApp();
  const { account, login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (profiles.length > 0 || account) return <Navigate to="/" replace />;

  const submit = async () => {
    if (await login(email.trim(), password)) navigate('/', { replace: true });
  };

  return (
    <Screen>
      <div style={{ margin: '48px 0 40px' }}>
        <img src="/logo-mark-144.png" alt="하루 한수" width={72} height={72} style={{ display: 'block', marginBottom: 12 }} />
        <p className="welcome-mark">하루 한수</p>
        <Body dim style={{ marginTop: 12 }}>
          가족 계정으로 로그인하면 여러 기기에서 같은 사람·번호함을 볼 수 있어요.
        </Body>
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
      <button type="button" className="text-btn" style={{ display: 'block', textAlign: 'center', width: '100%' }} onClick={() => navigate('/welcome')}>
        계정 없이 바로 시작하기
      </button>
    </Screen>
  );
}
