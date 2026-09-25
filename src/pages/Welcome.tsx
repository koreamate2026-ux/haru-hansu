import { Navigate, useNavigate } from 'react-router-dom';
import { BallRow } from '../components/LottoBall';
import { Body, Button, Screen } from '../components/ui';
import { useApp } from '../state/AppState';

export default function Welcome() {
  const navigate = useNavigate();
  const { profiles } = useApp();
  if (profiles.length > 0) return <Navigate to="/" replace />;

  return (
    <Screen>
      <div style={{ margin: '48px 0 40px' }}>
        <p className="welcome-mark">하루 한수</p>
        <h1 className="welcome-title">
          타고난 기운으로
          <br />
          이번 주 번호를 고릅니다
        </h1>
        <Body dim style={{ marginTop: 12 }}>
          태어난 날짜와 시간으로 사주를 보고, 나에게 모자란 기운을 채워 주는 숫자를 매주 새로 알려 드려요.
        </Body>
      </div>

      <div className="stack" style={{ marginBottom: 40 }}>
        <BallRow numbers={[3, 12, 15, 24, 31, 38]} size={42} />
        <p className="faint small" style={{ margin: 0 }}>
          번호마다 다섯 기운 중 하나가 정해져 있고, 공의 색으로 보여 줘요. 끝자리 3·8은 나무, 2·7은 불, 5·0은 흙, 4·9는 쇠, 1·6은 물이에요.
        </p>
      </div>

      <Button label="내 정보 입력하기" onPress={() => navigate('/profile')} />
      <p className="notice" style={{ marginTop: 16, textAlign: 'center' }}>
        이 숫자는 재미로 보는 참고용이에요. 어떤 숫자를 고르든 확률은 똑같아요. 입력한 정보는 이 브라우저에만 저장돼요.
      </p>
    </Screen>
  );
}
