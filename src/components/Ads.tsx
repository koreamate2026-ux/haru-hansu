import { useEffect, useRef, useState } from 'react';
import { useBilling } from '../state/BillingState';

/**
 * 광고 ID는 공개값이라 .env.production에 넣는다. 비어 있으면 광고 대신
 * 자리표시(점선 박스)를 보여 주고, 내 사주 팝업은 개발 서버에서만 띄운다.
 */
const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const ADSENSE_SLOT = import.meta.env.VITE_ADSENSE_SLOT as string | undefined;
const ADFIT_POPUP_UNIT = import.meta.env.VITE_ADFIT_POPUP_UNIT as string | undefined;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adfit?: { destroy?: (unit: string) => void };
  }
}

function loadAdSenseScript(client: string) {
  if (document.querySelector('script[data-adsense]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  s.crossOrigin = 'anonymous';
  s.dataset.adsense = '1';
  document.head.appendChild(s);
}

function Placeholder({ label = '광고 영역' }: { label?: string }) {
  return (
    <div className="ad-slot" role="complementary" aria-label={label}>
      <span className="faint small">{label}</span>
    </div>
  );
}

export function AdSenseBanner() {
  const pushed = useRef(false);
  const { loaded, premium } = useBilling();
  // 구독 여부를 모르는 동안에는 광고를 불러오지 않는다(플러스 회원에게 잠깐 보이는 것 방지)
  const hidden = !loaded || premium;

  useEffect(() => {
    if (hidden || !ADSENSE_CLIENT || !ADSENSE_SLOT || pushed.current) return;
    loadAdSenseScript(ADSENSE_CLIENT);
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 차단기 등으로 실패해도 화면은 그대로 둔다
    }
  }, [hidden]);

  if (hidden) return null;
  if (!ADSENSE_CLIENT || !ADSENSE_SLOT) return <Placeholder />;

  return (
    <div className="ad-banner" role="complementary" aria-label="광고">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

/** 애드핏은 스크립트가 로드될 때 화면의 ins를 찾아 채우므로, 붙일 때마다 스크립트를 새로 넣는다 */
function AdFitUnit({ unit, width, height }: { unit: string; width: number; height: number }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', unit);
    ins.setAttribute('data-ad-width', String(width));
    ins.setAttribute('data-ad-height', String(height));
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://t1.daumcdn.net/kas/static/ba.min.js';
    el.appendChild(ins);
    el.appendChild(s);
    return () => {
      window.adfit?.destroy?.(unit);
      el.innerHTML = '';
    };
  }, [unit, width, height]);

  return <div ref={box} style={{ width, minHeight: height, margin: '0 auto' }} />;
}

export const adFitPopupEnabled = Boolean(ADFIT_POPUP_UNIT) || import.meta.env.DEV;

const POPUP_WAIT_SEC = 3;

/** 내 사주에 들어가기 전에 띄우는 애드핏 광고 팝업. 몇 초 뒤 닫기 버튼이 켜진다 */
export function AdFitPopup({ onClose, onUpgrade }: { onClose: () => void; onUpgrade?: () => void }) {
  const [left, setLeft] = useState(POPUP_WAIT_SEC);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <div className="sheet-backdrop ad-popup-backdrop" role="dialog" aria-modal="true" aria-label="광고">
      <div className="ad-popup">
        <span className="faint small">광고</span>
        {ADFIT_POPUP_UNIT ? (
          <AdFitUnit unit={ADFIT_POPUP_UNIT} width={300} height={250} />
        ) : (
          <div className="ad-slot" style={{ width: 300, height: 250, margin: '0 auto' }}>
            <span className="faint small">애드핏 광고 영역 (광고 ID 입력 전)</span>
          </div>
        )}
        <button type="button" className="btn primary" onClick={onClose} disabled={left > 0}>
          {left > 0 ? `${left}초 후 닫을 수 있어요` : '닫고 내 사주 보기'}
        </button>
        {onUpgrade ? (
          <button type="button" className="link" style={{ margin: 0 }} onClick={onUpgrade}>
            광고 없이 보려면 하루 한수 플러스
          </button>
        ) : null}
      </div>
    </div>
  );
}
