/**
 * 좋아하는 사람 연동용 위인 목록. 생일은 널리 알려진 기록을 따랐고(조선 시대 인물은 음력),
 * 태어난 시간은 알 수 없어 시간 없이 계산한다. 연예인은 초상권·퍼블리시티권 문제로 목록에 넣지 않고
 * 사용자가 직접 입력한다.
 */
export interface HistoricalFigure {
  key: string;
  name: string;
  desc: string;
  calendar: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
}

export const HISTORICAL: HistoricalFigure[] = [
  { key: 'sejong', name: '세종대왕', desc: '한글을 만든 조선의 임금', calendar: 'lunar', year: 1397, month: 4, day: 10 },
  { key: 'yisunsin', name: '이순신', desc: '임진왜란을 이겨 낸 장군', calendar: 'lunar', year: 1545, month: 3, day: 8 },
  { key: 'saimdang', name: '신사임당', desc: '조선의 화가·문인', calendar: 'lunar', year: 1504, month: 10, day: 29 },
  { key: 'dasan', name: '정약용', desc: '조선 후기의 실학자', calendar: 'lunar', year: 1762, month: 6, day: 16 },
  { key: 'kimgu', name: '김구', desc: '독립운동가', calendar: 'solar', year: 1876, month: 8, day: 29 },
  { key: 'anjunggeun', name: '안중근', desc: '독립운동가', calendar: 'solar', year: 1879, month: 9, day: 2 },
  { key: 'yugwansun', name: '유관순', desc: '독립운동가', calendar: 'solar', year: 1902, month: 12, day: 16 },
  { key: 'bangjunghwan', name: '방정환', desc: '어린이날을 만든 아동문학가', calendar: 'solar', year: 1899, month: 11, day: 9 },
  { key: 'yundongju', name: '윤동주', desc: '시인', calendar: 'solar', year: 1917, month: 12, day: 30 },
  { key: 'einstein', name: '아인슈타인', desc: '상대성이론의 물리학자', calendar: 'solar', year: 1879, month: 3, day: 14 },
  { key: 'curie', name: '마리 퀴리', desc: '노벨상을 두 번 받은 과학자', calendar: 'solar', year: 1867, month: 11, day: 7 },
  { key: 'edison', name: '에디슨', desc: '발명가', calendar: 'solar', year: 1847, month: 2, day: 11 },
  { key: 'mozart', name: '모차르트', desc: '작곡가', calendar: 'solar', year: 1756, month: 1, day: 27 },
  { key: 'gogh', name: '빈센트 반 고흐', desc: '화가', calendar: 'solar', year: 1853, month: 3, day: 30 },
  { key: 'lincoln', name: '링컨', desc: '미국 16대 대통령', calendar: 'solar', year: 1809, month: 2, day: 12 },
  { key: 'gandhi', name: '간디', desc: '인도 독립운동 지도자', calendar: 'solar', year: 1869, month: 10, day: 2 },
  { key: 'keller', name: '헬렌 켈러', desc: '장애를 딛고 일어선 사회운동가', calendar: 'solar', year: 1880, month: 6, day: 27 },
];
