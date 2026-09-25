import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Body, Button, Header, Screen } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../state/AuthState';

type Step = 'info' | 'phone' | 'code';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, createHousehold } = useAuth();

  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digitsOnly = (s: string) => s.replace(/[^0-9]/g, '');
  const phoneOk = /^01[0-9]{8,9}$/.test(digitsOnly(phone));

  const goInfo = () => {
    if (!name.trim()) return setError('이름을 입력해 주세요.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('이메일을 확인해 주세요.');
    if (password.length < 8) return setError('비밀번호는 8자 이상이어야 해요.');
    setError(null);
    setStep('phone');
  };

  const sendCode = async () => {
    if (!phoneOk) return setError('휴대폰 번호를 확인해 주세요. (예: 01012345678)');
    setLoading(true);
    setError(null);
    try {
      const res = await api.requestPhoneOtp(digitsOnly(phone));
      setDevCode(res.devCode ?? null);
      setStep('code');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '인증번호를 보내지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (code.length !== 6) return setError('인증번호 6자리를 입력해 주세요.');
    setLoading(true);
    setError(null);
    try {
      const { verifyToken } = await api.verifyPhoneOtp(digitsOnly(phone), code);
      const ok = await signup(email.trim(), password, name.trim(), digitsOnly(phone), verifyToken);
      if (!ok) {
        setError('가입에 실패했어요. 처음부터 다시 시도해 주세요.');
        return;
      }
      if (!(await createHousehold(`${name.trim()}의 가족`))) {
        setError('가족 그룹을 만들지 못했어요. 설정에서 다시 시도해 주세요.');
      }
      navigate('/profile', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '인증번호 확인에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="가족 계정 만들기" fallback="/welcome" />
      <Screen>
        <p className="dim small" style={{ marginBottom: 20 }}>
          {step === 'info' ? '1 / 3 · 기본 정보' : step === 'phone' ? '2 / 3 · 휴대폰 인증' : '3 / 3 · 인증번호 확인'}
        </p>

        {step === 'info' ? (
          <div className="stack">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" maxLength={20} aria-label="이름" />
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="이메일"
            />
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (8자 이상)"
              aria-label="비밀번호"
            />
            {error ? <Body small style={{ color: 'var(--danger)' }}>{error}</Body> : null}
            <Button label="다음" onPress={goInfo} />
          </div>
        ) : null}

        {step === 'phone' ? (
          <div className="stack">
            <Body dim small>
              가족 그룹을 여러 기기에서 함께 쓰려면 휴대폰 인증이 필요해요.
            </Body>
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(digitsOnly(e.target.value))}
              placeholder="휴대폰 번호 (- 없이)"
              maxLength={11}
              aria-label="휴대폰 번호"
            />
            {error ? <Body small style={{ color: 'var(--danger)' }}>{error}</Body> : null}
            <Button label={loading ? '보내는 중…' : '인증번호 받기'} onPress={sendCode} disabled={loading || !phoneOk} />
            <Button label="이전" kind="secondary" onPress={() => setStep('info')} />
          </div>
        ) : null}

        {step === 'code' ? (
          <div className="stack">
            <Body dim small>
              {phone}로 보낸 6자리 인증번호를 입력해 주세요.
            </Body>
            {devCode ? (
              <Body small style={{ color: 'var(--gold)' }}>
                (테스트 모드: 실제 문자 대신 여기 바로 보여드려요 → {devCode})
              </Body>
            ) : null}
            <input
              className="input"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(digitsOnly(e.target.value).slice(0, 6))}
              placeholder="인증번호 6자리"
              maxLength={6}
              aria-label="인증번호"
            />
            {error ? <Body small style={{ color: 'var(--danger)' }}>{error}</Body> : null}
            <Button label={loading ? '확인 중…' : '확인하고 가입 완료'} onPress={confirmCode} disabled={loading || code.length !== 6} />
            <Button label="번호 다시 받기" kind="secondary" onPress={sendCode} disabled={loading} />
          </div>
        ) : null}
      </Screen>
    </>
  );
}
