import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Body, Header, Screen, Section } from '../components/ui';
import { copyText } from '../lib/familyLink';
import { FAQ, SUPPORT_CONTACT } from '../lib/supportFaq';
import { BusinessInfo } from './Legal';

/** 고객지원: 자주 묻는 질문, 문의 방법, 계정 삭제 안내. 로그인 없이 볼 수 있다 */
export default function Support() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <>
      <Header title="고객지원" fallback="/" />
      <Screen>
        <div className="support-contact">
          <strong>문의하기</strong>
          <div className="support-mail">
            <span>{SUPPORT_CONTACT.email}</span>
            <button
              type="button"
              className="text-btn"
              onClick={async () => {
                setCopied(await copyText(SUPPORT_CONTACT.email));
              }}
            >
              {copied ? '복사했어요' : '주소 복사'}
            </button>
          </div>
          <span className="dim small">
            전화 {SUPPORT_CONTACT.phone} · {SUPPORT_CONTACT.hours}
          </span>
          <span className="dim small">{SUPPORT_CONTACT.replyWithin} 문의할 때 아이디를 함께 적어 주세요.</span>
        </div>

        {FAQ.map((g) => (
          <Section key={g.id} title={g.title}>
            <div className="faq" id={g.id}>
              {g.items.map((it) => {
                const key = `${g.id}:${it.q}`;
                const on = open === key;
                return (
                  <div key={key} className="faq-item">
                    <button type="button" className="faq-q" aria-expanded={on} onClick={() => setOpen(on ? null : key)}>
                      <span>{it.q}</span>
                      <span aria-hidden>{on ? '−' : '+'}</span>
                    </button>
                    {on ? (
                      <div className="faq-a">
                        {it.a.map((line) => (
                          <Body key={line} small style={{ margin: 0 }}>
                            {line}
                          </Body>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Section>
        ))}

        <div className="legal-links">
          <button type="button" className="link" onClick={() => navigate('/legal/terms')}>
            이용약관
          </button>
          <button type="button" className="link" onClick={() => navigate('/legal/refund')}>
            환불 정책
          </button>
          <button type="button" className="link" onClick={() => navigate('/legal/privacy')}>
            개인정보처리방침
          </button>
        </div>
        <BusinessInfo />
      </Screen>
    </>
  );
}
