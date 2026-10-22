import { Navigate, useParams } from 'react-router-dom';
import { Body, Header, Screen, Section } from '../components/ui';
import { BUSINESS as B } from '../lib/business';
import { DOCS } from '../lib/legalDocs';

export default function Legal() {
  const { doc } = useParams();
  const d = doc ? DOCS[doc] : undefined;
  if (!d) return <Navigate to="/" replace />;
  return (
    <>
      <Header title={d.title} fallback="/settings" />
      <Screen>
        {d.sections.map((s) => (
          <Section key={s.title} title={s.title}>
            {s.body.map((line) => (
              <Body key={line} small style={{ marginBottom: 6 }}>
                {line}
              </Body>
            ))}
          </Section>
        ))}
      </Screen>
    </>
  );
}

/** 결제대행사 심사에 필요한 사업자 정보 표시 */
export function BusinessInfo() {
  return (
    <p className="notice" style={{ marginTop: 24 }}>
      {B.companyName} · 대표 {B.ceo} · 사업자등록번호 {B.registrationNo} · 통신판매업 {B.mailOrderNo} · {B.address} · 고객센터 {B.phone} · {B.email}
    </p>
  );
}
