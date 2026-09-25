import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Body, Button, Screen, Section, Title } from '../components/ui';
import { DEFAULT_DRAW_API } from '../lib/draws';
import { useApp } from '../state/AppState';

export default function Settings() {
  const navigate = useNavigate();
  const { profiles, activeProfile, setActiveProfile, settings, updateSettings, resetAll } = useApp();
  const [apiBase, setApiBase] = useState(settings.drawApiBase);

  const onReset = () => {
    if (window.confirm('모든 정보를 지울까요?\n등록한 사람, 저장한 번호, 설정이 이 브라우저에서 모두 지워져요.')) {
      resetAll();
      navigate('/welcome', { replace: true });
    }
  };

  return (
    <Screen tabs>
      <Title>설정</Title>

      <Section title="사람">
        <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
          {profiles.map((p) => {
            const on = p.id === activeProfile?.id;
            return (
              <div key={p.id} className="person">
                <button type="button" className="person-main" onClick={() => setActiveProfile(p.id)} aria-pressed={on}>
                  <div className="person-name">
                    {p.name}
                    {on ? <span className="dim">  ·  지금 보는 중</span> : null}
                  </div>
                  <div className="person-detail">
                    {p.calendar === 'lunar' ? '음력' : '양력'} {p.year}.{p.month}.{p.day}
                    {p.hour !== null ? ` ${p.hour}시` : ' 시간 모름'}
                  </div>
                </button>
                <button type="button" className="text-btn" style={{ fontSize: 15 }} onClick={() => navigate(`/profile?id=${encodeURIComponent(p.id)}`)}>
                  수정
                </button>
              </div>
            );
          })}
        </div>
        <Button label="가족·친구 추가" kind="secondary" onPress={() => navigate('/profile')} />
      </Section>

      <Section title="당첨번호 조회 주소">
        <Body dim small style={{ marginBottom: 12 }}>
          비워두면 기본 주소로 조회해요. 조회가 막히면 직접 운영하는 중계 서버 주소를 넣을 수 있어요. 주소 끝에 회차 번호가 붙어요.
        </Body>
        <input
          className="input small-text"
          type="url"
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          onBlur={() => updateSettings({ drawApiBase: apiBase.trim() })}
          placeholder={DEFAULT_DRAW_API}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="당첨번호 조회 주소"
        />
      </Section>

      <Section title="정보">
        <button type="button" className="list-row" onClick={() => navigate('/about')}>
          번호를 고르는 방법
        </button>
        <Body dim small style={{ marginTop: 8 }}>
          입력한 생년월일과 저장한 번호는 이 브라우저에만 저장되고 어디에도 전송되지 않아요. 당첨번호를 조회할 때만 회차 번호가 조회 주소로 전송돼요.
        </Body>
      </Section>

      <Button label="모든 정보 지우기" kind="danger" onPress={onReset} />
    </Screen>
  );
}
