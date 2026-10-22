/**
 * 스토어 등록용 정적 페이지 만들기(자바스크립트 없이 열리는 HTML).
 * 앱 안의 약관·고객지원과 같은 글(src/lib/legalDocs.ts, supportFaq.ts)로 dist/에 만든다.
 *   - privacy.html  개인정보처리방침 (애플·구글 "개인정보처리방침 URL")
 *   - terms.html    이용약관
 *   - refund.html   환불 정책
 *   - support.html  고객지원 (애플 "지원 URL"), #delete-account = 구글 "계정 삭제 요청 URL"
 * npm run build 끝에 자동으로 실행된다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { BUSINESS as B } from '../src/lib/business';
import { DOCS } from '../src/lib/legalDocs';
import { FAQ, SUPPORT_CONTACT } from '../src/lib/supportFaq';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const page = (title: string, body: string) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · 하루 한수</title>
<style>
:root{--bg:#f3f0e6;--fg:#24211b;--dim:#5c584c;--line:#ddd6c5;--gold:#8a5f1a;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#191714;--fg:#ece6d8;--dim:#b3ab98;--line:#3a352c;--gold:#d9a85a;color-scheme:dark}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:28px 0 8px;padding-top:12px;border-top:1px solid var(--line)}
h3{font-size:15px;margin:16px 0 4px}p{margin:0 0 8px}.dim{color:var(--dim);font-size:13px}a{color:var(--gold)}
nav{display:flex;flex-wrap:wrap;gap:6px 14px;margin:8px 0 24px;font-size:14px}footer{margin-top:40px;color:var(--dim);font-size:12px}
</style></head><body><main>
<p class="dim">하루 한수</p>
${body}
<nav><a href="support.html">고객지원</a><a href="terms.html">이용약관</a><a href="refund.html">환불 정책</a><a href="privacy.html">개인정보처리방침</a></nav>
<footer>${esc(`${B.companyName} · 대표 ${B.ceo} · 사업자등록번호 ${B.registrationNo} · 통신판매업 ${B.mailOrderNo} · ${B.address} · 고객센터 ${B.phone} · ${B.email}`)}</footer>
</main></body></html>
`;

mkdirSync('dist', { recursive: true });
const files: Record<string, string> = { terms: 'terms', refund: 'refund', privacy: 'privacy' };
for (const [key, file] of Object.entries(files)) {
  const d = DOCS[key];
  const body = `<h1>${esc(d.title)}</h1>\n` + d.sections.map((s) => `<h2>${esc(s.title)}</h2>\n${s.body.map((l) => `<p>${esc(l)}</p>`).join('\n')}`).join('\n');
  writeFileSync(`dist/${file}.html`, page(d.title, body));
}
const support =
  `<h1>고객지원</h1>
<p><strong>문의:</strong> ${esc(SUPPORT_CONTACT.email)} · 전화 ${esc(SUPPORT_CONTACT.phone)}</p>
<p class="dim">${esc(SUPPORT_CONTACT.hours)} · ${esc(SUPPORT_CONTACT.replyWithin)} 문의할 때 아이디를 함께 적어 주세요.</p>
` +
  FAQ.map((g) => `<h2 id="${g.id}">${esc(g.title)}</h2>\n${g.items.map((it) => `<h3>${esc(it.q)}</h3>\n${it.a.map((l) => `<p>${esc(l)}</p>`).join('\n')}`).join('\n')}`).join('\n');
writeFileSync('dist/support.html', page('고객지원', support));
console.log('정적 페이지: privacy.html, terms.html, refund.html, support.html');
