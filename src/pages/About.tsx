import { Body, Header, Screen, Section } from '../components/ui';
import { ELEMENTS, ELEMENT_INFO } from '../lib/elements';

const STEPS = [
  {
    title: '사주 여덟 글자 만들기',
    body: '태어난 해·달·날·시를 옛 달력(만세력)으로 바꾸면 각각 두 글자씩, 모두 여덟 글자가 나와요. 이것이 사주예요. 새해는 1월 1일이 아니라 입춘(2월 4일 무렵)부터 세요. 시간을 모르면 여섯 글자로 계산해요.',
  },
  {
    title: '다섯 기운 세기',
    body: '여덟 글자는 각각 나무·불·흙·쇠·물 중 하나에 속해요. 어떤 기운이 많고 적은지 세어 봐요. 태어난 달은 계절의 힘이 커서 두 번 셉니다.',
  },
  {
    title: '나에게 필요한 기운 찾기',
    body: '태어난 날의 위쪽 글자를 ‘나’로 봐요. 내 힘이 약하면 나를 도와주는 기운을, 너무 세면 힘을 풀어 주는 기운을 골라요. 전통 사주 풀이 방법을 쉽게 줄인 거예요.',
  },
  {
    title: '번호마다 기운 나누기',
    body: '1~45번을 끝자리에 따라 다섯 기운으로 나눠요. 기운마다 정확히 9개씩이에요. 나에게 필요한 기운, 모자란 기운, 추첨하는 토요일에 강한 기운의 번호가 더 잘 뽑히게 해요.',
  },
  {
    title: '매주 같은 규칙으로 뽑기',
    body: '이름·생년월일·시간·회차를 합쳐서 번호를 뽑아요. 그래서 같은 사람은 같은 주에 언제 봐도 같은 번호가 나오고, 다음 주가 되면 번호가 바뀌어요. 한 기운에서는 최대 3개까지만 뽑아요.',
  },
];

export default function About() {
  return (
    <>
      <Header title="번호를 고르는 방법" />
      <Screen>
        <Section title="다섯 기운과 번호">
          <div className="el-table">
            {ELEMENTS.map((e) => {
              const i = ELEMENT_INFO[e];
              return (
                <div key={e} className="el-cell">
                  <span className="el-dot" style={{ backgroundColor: i.color, color: i.ink, borderWidth: e === 'water' ? 1 : 0 }}>
                    {i.hanja}
                  </span>
                  <span className="el-digits">
                    <strong>{i.name}</strong>
                    <br />
                    {i.digits.join('·')}
                  </span>
                </div>
              );
            })}
          </div>
          <Body dim small style={{ marginTop: 12 }}>
            위 숫자는 번호의 끝자리예요. 옛 그림 ‘하도(河圖)’에서 숫자와 기운을 짝지은 방식을 따랐어요. 물은 1·6, 불은 2·7, 나무는 3·8, 쇠는 4·9, 흙은 5·10이에요.
          </Body>
        </Section>

        {STEPS.map((s, idx) => (
          <div key={s.title} className="step">
            <span className="step-no">{idx + 1}</span>
            <div style={{ flex: 1 }}>
              <h3 className="step-title">{s.title}</h3>
              <Body>{s.body}</Body>
            </div>
          </div>
        ))}

        <div className="notice-box">
          <h3 className="notice-title">꼭 알아두세요</h3>
          <Body>
            1등 확률은 어떤 숫자를 고르든 8,145,060분의 1로 같아요. 이 앱의 숫자는 전통 사주 풀이를 재미로 옮긴 것이라, 확률을 높이지 않아요. 여유 안에서 즐겨 주세요.
          </Body>
          <Body dim small style={{ marginTop: 8 }}>
            도박 문제로 어려움이 있다면 한국도박문제예방치유원 상담전화 1336에서 도움을 받을 수 있어요.
          </Body>
        </div>
      </Screen>
    </>
  );
}
