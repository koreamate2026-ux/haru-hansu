/**
 * 좋아하는 사람 연동용 인물 목록(위인·국내 스타·해외 스타).
 * - 생일은 널리 알려진 공개 기록을 따랐고(조선 시대 위인은 음력), 태어난 시간은 몰라서 시간 없이 계산한다.
 * - 얼굴은 그리지 않고 그 사람을 떠올릴 물건(art)으로만 표시한다. 그룹 로고 같은 상표도 쓰지 않는다.
 * - 명언(quote)은 기록이 분명한 위인에게만 넣는다. 살아 있는 연예인에게는 말을 지어 붙이지 않는다.
 * - 미성년자는 넣지 않는다.
 * ⚠️ 연예인 이름을 유료 기능에 쓰는 것은 퍼블리시티권 분쟁 소지가 있다(운영자가 알고 선택함).
 */
export type FamousGroup = 'historical' | 'kstar' | 'global';

export const GROUPS: { id: FamousGroup; label: string; categories: string[] }[] = [
  { id: 'historical', label: '위인', categories: ['조선의 위인', '독립운동가', '문학·교육', '과학·발명', '예술', '세계를 바꾼 사람'] },
  { id: 'kstar', label: '국내 스타', categories: ['가수', '배우', '방송인', '스포츠'] },
  { id: 'global', label: '해외 스타', categories: ['가수', '배우', '스포츠'] },
];

export interface FamousPerson {
  key: string;
  group: FamousGroup;
  category: string;
  name: string;
  desc: string;
  intro: string;
  quote?: string;
  /** 그림 이름(components/FigureArt). 위인은 자기 key, 스타는 분야 그림 */
  art: string;
  calendar: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
}

type Row = Omit<FamousPerson, 'group' | 'art'> & { art?: string };
const H = (r: Row): FamousPerson => ({ ...r, group: 'historical', art: r.art ?? r.key });
const K = (r: Row & { art: string }): FamousPerson => ({ ...r, group: 'kstar' });
const G = (r: Row & { art: string }): FamousPerson => ({ ...r, group: 'global' });
const solar = { calendar: 'solar' as const };

export const FAMOUS: FamousPerson[] = [
  // ─── 위인 ───
  H({ key: 'sejong', category: '조선의 위인', name: '세종대왕', desc: '한글을 만든 조선의 임금', calendar: 'lunar', year: 1397, month: 4, day: 10,
    intro: '조선의 네 번째 임금이에요. 백성이 쉽게 읽고 쓰도록 훈민정음(한글)을 만들고, 측우기·해시계 같은 과학 발명을 이끌었어요.',
    quote: '나랏말싸미 듕귁에 달아 문자와로 서르 사맛디 아니할쎄 (훈민정음 서문)' }),
  H({ key: 'yisunsin', category: '조선의 위인', name: '이순신', desc: '임진왜란을 이겨 낸 장군', calendar: 'lunar', year: 1545, month: 3, day: 8,
    intro: '임진왜란 때 조선 수군을 이끈 장군이에요. 거북선을 앞세워 여러 해전에서 이기며 나라를 지켰어요.',
    quote: '신에게는 아직 열두 척의 배가 남아 있사옵니다.' }),
  H({ key: 'saimdang', category: '조선의 위인', name: '신사임당', desc: '조선의 화가·문인', calendar: 'lunar', year: 1504, month: 10, day: 29,
    intro: '풀벌레와 포도 그림으로 이름난 조선의 화가이자 문인이에요. 학자 율곡 이이의 어머니이기도 해요.',
    quote: '늙으신 어머님을 강릉에 두고 외로이 서울로 가는 이 마음 (대관령을 넘으며)' }),
  H({ key: 'dasan', category: '조선의 위인', name: '정약용', desc: '조선 후기의 실학자', calendar: 'lunar', year: 1762, month: 6, day: 16,
    intro: '백성의 삶에 쓸모 있는 학문을 한 실학자예요. 수원 화성을 쌓을 때 거중기를 만들었고 「목민심서」 등 많은 책을 남겼어요.',
    quote: '청렴은 목민관의 근본 임무요, 모든 선의 원천이요, 모든 덕의 뿌리다. (목민심서)' }),
  H({ key: 'kimgu', category: '독립운동가', name: '김구', desc: '임시정부 주석을 지낸 독립운동가', ...solar, year: 1876, month: 8, day: 29,
    intro: '대한민국 임시정부의 주석을 지낸 독립운동가예요. 자서전 「백범일지」에 나라에 대한 꿈을 남겼어요.',
    quote: '나는 우리나라가 세계에서 가장 아름다운 나라가 되기를 원한다. (나의 소원)' }),
  H({ key: 'anjunggeun', category: '독립운동가', name: '안중근', desc: '하얼빈 의거의 독립운동가', ...solar, year: 1879, month: 9, day: 2,
    intro: '1909년 하얼빈에서 의거를 일으킨 독립운동가예요. 감옥에서도 「동양평화론」을 쓰며 평화를 이야기했어요.',
    quote: '하루라도 책을 읽지 않으면 입안에 가시가 돋는다.' }),
  H({ key: 'yugwansun', category: '독립운동가', name: '유관순', desc: '3·1 운동의 독립운동가', ...solar, year: 1902, month: 12, day: 16,
    intro: '3·1 운동 때 고향 천안의 아우내 장터에서 만세 운동을 이끈 독립운동가예요.',
    quote: '나라에 바칠 목숨이 오직 하나밖에 없는 것만이 이 소녀의 유일한 슬픔입니다.' }),
  H({ key: 'bangjunghwan', category: '문학·교육', name: '방정환', desc: '어린이날을 만든 아동문학가', ...solar, year: 1899, month: 11, day: 9,
    intro: '"어린이"라는 말을 널리 알리고 어린이날을 만든 아동문학가예요. 잡지 「어린이」를 펴냈어요.',
    quote: '어린이를 내려다보지 마시고 쳐다보아 주십시오.' }),
  H({ key: 'yundongju', category: '문학·교육', name: '윤동주', desc: '「서시」의 시인', ...solar, year: 1917, month: 12, day: 30,
    intro: '일제강점기에 「서시」, 「별 헤는 밤」을 쓴 시인이에요. 시집 「하늘과 바람과 별과 시」가 남아 있어요.',
    quote: '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를 (서시)' }),
  H({ key: 'einstein', category: '과학·발명', name: '아인슈타인', desc: '상대성이론의 물리학자', ...solar, year: 1879, month: 3, day: 14,
    intro: '상대성이론을 세운 물리학자예요. 1921년 노벨 물리학상을 받았어요.',
    quote: '상상력은 지식보다 중요하다.' }),
  H({ key: 'curie', category: '과학·발명', name: '마리 퀴리', desc: '노벨상을 두 번 받은 과학자', ...solar, year: 1867, month: 11, day: 7,
    intro: '라듐과 폴로늄을 발견한 과학자예요. 물리학과 화학, 두 분야에서 노벨상을 받았어요.',
    quote: '인생에서 두려워할 것은 없다. 이해해야 할 것이 있을 뿐이다.' }),
  H({ key: 'edison', category: '과학·발명', name: '에디슨', desc: '발명가', ...solar, year: 1847, month: 2, day: 11,
    intro: '전구와 축음기를 비롯해 1,000개가 넘는 발명 특허를 낸 발명가예요.',
    quote: '천재는 1%의 영감과 99%의 노력으로 이루어진다.' }),
  H({ key: 'mozart', category: '예술', name: '모차르트', desc: '작곡가', ...solar, year: 1756, month: 1, day: 27,
    intro: '오스트리아의 작곡가예요. 어린 시절부터 작곡을 시작해 짧은 생애 동안 600곡이 넘는 곡을 남겼어요.' }),
  H({ key: 'gogh', category: '예술', name: '빈센트 반 고흐', desc: '화가', ...solar, year: 1853, month: 3, day: 30,
    intro: '네덜란드의 화가예요. 「해바라기」, 「별이 빛나는 밤」처럼 강렬한 색과 붓질로 유명해요.',
    quote: '나는 그림을 꿈꾸고, 그 꿈을 그린다.' }),
  H({ key: 'lincoln', category: '세계를 바꾼 사람', name: '링컨', desc: '미국 16대 대통령', ...solar, year: 1809, month: 2, day: 12,
    intro: '미국의 16대 대통령이에요. 남북전쟁 중에 노예 해방을 이끌었어요.',
    quote: '국민의, 국민에 의한, 국민을 위한 정부 (게티즈버그 연설)' }),
  H({ key: 'gandhi', category: '세계를 바꾼 사람', name: '간디', desc: '인도 독립운동 지도자', ...solar, year: 1869, month: 10, day: 2,
    intro: '폭력을 쓰지 않는 저항으로 인도 독립운동을 이끈 지도자예요. 물레를 돌려 직접 옷감을 짜며 자립을 강조했어요.',
    quote: '약한 사람은 용서할 수 없다. 용서는 강한 사람의 몫이다.' }),
  H({ key: 'keller', category: '세계를 바꾼 사람', name: '헬렌 켈러', desc: '장애를 딛고 일어선 사회운동가', ...solar, year: 1880, month: 6, day: 27,
    intro: '보지도 듣지도 못했지만 점자로 배우며 대학을 졸업했고, 평생 장애인의 권리를 위해 일한 사회운동가예요.',
    quote: '인생은 과감한 모험이거나, 아무것도 아니다.' }),

  // ─── 국내 스타 ───
  K({ key: 'iu', category: '가수', name: '아이유', desc: '가수·배우', art: 'mic', ...solar, year: 1993, month: 5, day: 16, intro: '싱어송라이터이자 배우로 활동하는 가수예요.' }),
  K({ key: 'bts-rm', category: '가수', name: 'RM', desc: '방탄소년단 리더', art: 'stage', ...solar, year: 1994, month: 9, day: 12, intro: '방탄소년단의 리더이자 래퍼예요.' }),
  K({ key: 'bts-jin', category: '가수', name: '진', desc: '방탄소년단 보컬', art: 'stage', ...solar, year: 1992, month: 12, day: 4, intro: '방탄소년단의 보컬이에요.' }),
  K({ key: 'bts-suga', category: '가수', name: '슈가', desc: '방탄소년단 래퍼·프로듀서', art: 'headphones', ...solar, year: 1993, month: 3, day: 9, intro: '방탄소년단의 래퍼이자 프로듀서예요.' }),
  K({ key: 'bts-jhope', category: '가수', name: '제이홉', desc: '방탄소년단 래퍼·댄서', art: 'dance', ...solar, year: 1994, month: 2, day: 18, intro: '방탄소년단의 래퍼이자 메인 댄서예요.' }),
  K({ key: 'bts-jimin', category: '가수', name: '지민', desc: '방탄소년단 보컬·댄서', art: 'dance', ...solar, year: 1995, month: 10, day: 13, intro: '방탄소년단의 보컬이자 댄서예요.' }),
  K({ key: 'bts-v', category: '가수', name: '뷔', desc: '방탄소년단 보컬', art: 'stage', ...solar, year: 1995, month: 12, day: 30, intro: '방탄소년단의 보컬이에요.' }),
  K({ key: 'bts-jungkook', category: '가수', name: '정국', desc: '방탄소년단 메인 보컬', art: 'mic', ...solar, year: 1997, month: 9, day: 1, intro: '방탄소년단의 메인 보컬이에요.' }),
  K({ key: 'bp-jisoo', category: '가수', name: '지수', desc: '블랙핑크 보컬', art: 'stage', ...solar, year: 1995, month: 1, day: 3, intro: '블랙핑크의 보컬이자 배우예요.' }),
  K({ key: 'bp-jennie', category: '가수', name: '제니', desc: '블랙핑크 래퍼·보컬', art: 'mic', ...solar, year: 1996, month: 1, day: 16, intro: '블랙핑크의 래퍼이자 보컬이에요.' }),
  K({ key: 'bp-rose', category: '가수', name: '로제', desc: '블랙핑크 메인 보컬', art: 'guitar', ...solar, year: 1997, month: 2, day: 11, intro: '블랙핑크의 메인 보컬이에요.' }),
  K({ key: 'bp-lisa', category: '가수', name: '리사', desc: '블랙핑크 메인 댄서', art: 'dance', ...solar, year: 1997, month: 3, day: 27, intro: '블랙핑크의 메인 댄서이자 래퍼예요.' }),
  K({ key: 'limyoungwoong', category: '가수', name: '임영웅', desc: '가수', art: 'mic', ...solar, year: 1991, month: 6, day: 16, intro: '트로트와 발라드를 부르는 가수예요.' }),
  K({ key: 'psy', category: '가수', name: '싸이', desc: '가수', art: 'dance', ...solar, year: 1977, month: 12, day: 31, intro: '「강남스타일」로 세계에 이름을 알린 가수예요.' }),
  K({ key: 'leehyori', category: '가수', name: '이효리', desc: '가수', art: 'mic', ...solar, year: 1979, month: 5, day: 10, intro: '가수이자 방송인으로 활동해 왔어요.' }),
  K({ key: 'leebyunghun', category: '배우', name: '이병헌', desc: '배우', art: 'film', ...solar, year: 1970, month: 7, day: 12, intro: '국내외 영화와 드라마에서 활동하는 배우예요.' }),
  K({ key: 'songkangho', category: '배우', name: '송강호', desc: '배우', art: 'film', ...solar, year: 1967, month: 1, day: 17, intro: '「기생충」 등 여러 영화에 출연한 배우예요.' }),
  K({ key: 'gongyoo', category: '배우', name: '공유', desc: '배우', art: 'camera', ...solar, year: 1979, month: 7, day: 10, intro: '영화와 드라마에서 활동하는 배우예요.' }),
  K({ key: 'junjihyun', category: '배우', name: '전지현', desc: '배우', art: 'camera', ...solar, year: 1981, month: 10, day: 30, intro: '영화와 드라마에서 활동하는 배우예요.' }),
  K({ key: 'parkbogum', category: '배우', name: '박보검', desc: '배우', art: 'film', ...solar, year: 1993, month: 6, day: 16, intro: '드라마와 영화에서 활동하는 배우예요.' }),
  K({ key: 'suzy', category: '배우', name: '수지', desc: '배우·가수', art: 'camera', ...solar, year: 1994, month: 10, day: 10, intro: '가수로 데뷔해 배우로도 활동하고 있어요.' }),
  K({ key: 'chaeunwoo', category: '배우', name: '차은우', desc: '배우·가수', art: 'film', ...solar, year: 1997, month: 3, day: 30, intro: '가수이자 배우로 활동하고 있어요.' }),
  K({ key: 'yoojaesuk', category: '방송인', name: '유재석', desc: '방송인', art: 'tv', ...solar, year: 1972, month: 8, day: 14, intro: '여러 예능 프로그램을 이끌어 온 방송인이에요.' }),
  K({ key: 'kanghodong', category: '방송인', name: '강호동', desc: '방송인', art: 'tv', ...solar, year: 1970, month: 6, day: 11, intro: '씨름 선수 출신의 방송인이에요.' }),
  K({ key: 'sonheungmin', category: '스포츠', name: '손흥민', desc: '축구 선수', art: 'soccer', ...solar, year: 1992, month: 7, day: 8, intro: '국가대표 주장을 맡은 축구 선수예요.' }),
  K({ key: 'kimyuna', category: '스포츠', name: '김연아', desc: '피겨스케이팅 선수 출신', art: 'skate', ...solar, year: 1990, month: 9, day: 5, intro: '올림픽 금메달을 딴 피겨스케이팅 선수 출신이에요.' }),
  K({ key: 'ryuhyunjin', category: '스포츠', name: '류현진', desc: '야구 선수', art: 'baseball', ...solar, year: 1987, month: 3, day: 25, intro: '국내와 미국 메이저리그에서 뛴 투수예요.' }),

  // ─── 해외 스타 ───
  G({ key: 'taylorswift', category: '가수', name: '테일러 스위프트', desc: '미국 가수', art: 'guitar', ...solar, year: 1989, month: 12, day: 13, intro: '직접 곡을 쓰고 부르는 미국의 싱어송라이터예요.' }),
  G({ key: 'beyonce', category: '가수', name: '비욘세', desc: '미국 가수', art: 'mic', ...solar, year: 1981, month: 9, day: 4, intro: '미국의 가수이자 공연가예요.' }),
  G({ key: 'brunomars', category: '가수', name: '브루노 마스', desc: '미국 가수', art: 'guitar', ...solar, year: 1985, month: 10, day: 8, intro: '노래와 연주, 작곡을 모두 하는 미국의 가수예요.' }),
  G({ key: 'arianagrande', category: '가수', name: '아리아나 그란데', desc: '미국 가수', art: 'mic', ...solar, year: 1993, month: 6, day: 26, intro: '미국의 가수이자 배우예요.' }),
  G({ key: 'edsheeran', category: '가수', name: '에드 시런', desc: '영국 가수', art: 'guitar', ...solar, year: 1991, month: 2, day: 17, intro: '기타를 들고 노래하는 영국의 싱어송라이터예요.' }),
  G({ key: 'justinbieber', category: '가수', name: '저스틴 비버', desc: '캐나다 가수', art: 'mic', ...solar, year: 1994, month: 3, day: 1, intro: '캐나다 출신의 가수예요.' }),
  G({ key: 'billieeilish', category: '가수', name: '빌리 아일리시', desc: '미국 가수', art: 'headphones', ...solar, year: 2001, month: 12, day: 18, intro: '오빠와 함께 곡을 만드는 미국의 싱어송라이터예요.' }),
  G({ key: 'michaeljackson', category: '가수', name: '마이클 잭슨', desc: '미국 가수', art: 'dance', ...solar, year: 1958, month: 8, day: 29, intro: '"팝의 황제"로 불린 미국의 가수이자 댄서예요.' }),
  G({ key: 'dicaprio', category: '배우', name: '레오나르도 디카프리오', desc: '미국 배우', art: 'film', ...solar, year: 1974, month: 11, day: 11, intro: '미국의 영화배우예요.' }),
  G({ key: 'tomcruise', category: '배우', name: '톰 크루즈', desc: '미국 배우', art: 'camera', ...solar, year: 1962, month: 7, day: 3, intro: '액션 영화로 유명한 미국의 배우예요.' }),
  G({ key: 'keanureeves', category: '배우', name: '키아누 리브스', desc: '배우', art: 'film', ...solar, year: 1964, month: 9, day: 2, intro: '캐나다에서 자란 영화배우예요.' }),
  G({ key: 'emmawatson', category: '배우', name: '엠마 왓슨', desc: '영국 배우', art: 'camera', ...solar, year: 1990, month: 4, day: 15, intro: '영국의 배우예요.' }),
  G({ key: 'zendaya', category: '배우', name: '젠데이아', desc: '미국 배우', art: 'film', ...solar, year: 1996, month: 9, day: 1, intro: '미국의 배우이자 가수예요.' }),
  G({ key: 'messi', category: '스포츠', name: '리오넬 메시', desc: '아르헨티나 축구 선수', art: 'soccer', ...solar, year: 1987, month: 6, day: 24, intro: '아르헨티나의 축구 선수예요.' }),
  G({ key: 'ronaldo', category: '스포츠', name: '크리스티아누 호날두', desc: '포르투갈 축구 선수', art: 'soccer', ...solar, year: 1985, month: 2, day: 5, intro: '포르투갈의 축구 선수예요.' }),
  G({ key: 'ohtani', category: '스포츠', name: '오타니 쇼헤이', desc: '일본 야구 선수', art: 'baseball', ...solar, year: 1994, month: 7, day: 5, intro: '투수와 타자를 함께 하는 일본의 야구 선수예요.' }),
  G({ key: 'jordan', category: '스포츠', name: '마이클 조던', desc: '미국 농구 선수 출신', art: 'basketball', ...solar, year: 1963, month: 2, day: 17, intro: '미국 프로농구에서 활약한 농구 선수 출신이에요.' }),
];

export const famousOf = (key: string | null | undefined) => (key ? FAMOUS.find((p) => p.key === key) : undefined);
