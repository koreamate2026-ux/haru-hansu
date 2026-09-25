/**
 * 문자(SMS) 발송. SMS_PROVIDER 환경변수로 업체를 고른다.
 *
 * - 값이 없거나 "test"면: 실제로 보내지 않고 콘솔에만 찍고, 인증번호를 응답에
 *   그대로 실어 준다(devCode). 업체 계정이 아직 없을 때 쓰는 개발용 모드.
 * - "solapi"로 바꾸면 실제 문자를 보낸다. SOLAPI_API_KEY, SOLAPI_API_SECRET,
 *   SOLAPI_SENDER(사전 등록한 발신번호, 숫자만)를 .env에 채워야 한다.
 *   ⚠️ Solapi API 스펙은 바뀔 수 있으니, 처음 실제 전환할 때 공식 문서
 *   (https://developers.solapi.com)와 대조해서 한 번 확인해 보는 걸 권장.
 */

export interface SendSmsResult {
  ok: boolean;
  /** 테스트 모드일 때만: 실제로는 문자로 가야 할 인증번호를 여기 그대로 담아 준다 */
  devCode?: string;
}

const PROVIDER = process.env.SMS_PROVIDER || 'test';

export async function sendOtpSms(phone: string, code: string): Promise<SendSmsResult> {
  if (PROVIDER === 'test') {
    console.log(`[SMS 테스트 모드] ${phone} 로 보낼 인증번호: ${code}`);
    return { ok: true, devCode: code };
  }

  if (PROVIDER === 'solapi') {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const sender = process.env.SOLAPI_SENDER;
    if (!apiKey || !apiSecret || !sender) {
      throw new Error('SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER 환경변수를 먼저 채워 주세요.');
    }
    const { createHmac, randomBytes } = await import('node:crypto');
    const date = new Date().toISOString();
    const salt = randomBytes(16).toString('hex');
    const signature = createHmac('sha256', apiSecret).update(date + salt).digest('hex');

    const res = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: { to: phone, from: sender, text: `[하루 한수] 인증번호는 ${code} 입니다.` },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`문자 발송 실패 (${res.status}): ${text.slice(0, 200)}`);
    }
    return { ok: true };
  }

  throw new Error(`지원하지 않는 SMS_PROVIDER예요: ${PROVIDER}`);
}
