import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export function Screen({ children, tabs = false }: { children: ReactNode; tabs?: boolean }) {
  return <main className={tabs ? 'screen with-tabs' : 'screen'}>{children}</main>;
}

/** 모달·상세 화면 상단: 뒤로 가기 + 제목 */
export function Header({ title, fallback = '/' }: { title: string; fallback?: string }) {
  const back = useGoBack(fallback);
  return (
    <header className="header">
      <button type="button" className="icon-btn" onClick={back} aria-label="뒤로">
        ‹
      </button>
      <h1>{title}</h1>
    </header>
  );
}

/** 앱 안에서 들어왔으면 뒤로, 주소로 바로 들어왔으면 fallback으로 */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate();
  return () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(fallback, { replace: true }));
}

export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="title-block">
      <h1 className="title">{children}</h1>
      {sub ? <p className="sub">{sub}</p> : null}
    </div>
  );
}

export function Section({ title, children, style }: { title?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="section" style={style}>
      {title ? <h2 className="section-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Body({ children, dim, small, style }: { children: ReactNode; dim?: boolean; small?: boolean; style?: CSSProperties }) {
  return (
    <p className={['body', dim && 'dim', small && 'small'].filter(Boolean).join(' ')} style={style}>
      {children}
    </p>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`btn ${kind}`} onClick={onPress} disabled={disabled}>
      {label}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segment" role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} className={on ? 'on' : ''} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={value} aria-label={label} className="switch" onClick={() => onChange(!value)} />;
}

const TABS = [
  { to: '/', label: '오늘의 숫자', glyph: '數' },
  { to: '/saju', label: '내 사주', glyph: '柱' },
  { to: '/tickets', label: '번호함', glyph: '藏' },
  { to: '/settings', label: '설정', glyph: '設' },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="주요 화면">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="glyph" aria-hidden>
            {t.glyph}
          </span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** 잠깐 떴다 사라지는 안내 (앱의 햅틱 피드백 대신) */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 1800);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <div key={msg.key} className="toast" role="status">
      {msg.text}
    </div>
  ) : null;
  return { show: (text: string) => setMsg({ text, key: Date.now() }), node };
}
