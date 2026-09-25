import type { Element } from './types';

export const ELEMENTS: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];

export const ELEMENT_INFO: Record<
  Element,
  { ko: string; name: string; hanja: string; color: string; ink: string; colorName: string; direction: string; digits: [number, number] }
> = {
  // 하도(河圖) 수리: 수 1·6, 화 2·7, 목 3·8, 금 4·9, 토 5·10
  wood: { ko: '목', name: '나무', hanja: '木', color: '#3E8E6A', ink: '#FFFFFF', colorName: '푸른색', direction: '동쪽', digits: [3, 8] },
  fire: { ko: '화', name: '불', hanja: '火', color: '#D2452F', ink: '#FFFFFF', colorName: '붉은색', direction: '남쪽', digits: [2, 7] },
  earth: { ko: '토', name: '흙', hanja: '土', color: '#E0B43A', ink: '#2A2208', colorName: '노란색', direction: '중앙', digits: [5, 0] },
  metal: { ko: '금', name: '쇠', hanja: '金', color: '#E4E1D8', ink: '#1F2A5A', colorName: '흰색', direction: '서쪽', digits: [4, 9] },
  water: { ko: '수', name: '물', hanja: '水', color: '#0E1224', ink: '#FFFFFF', colorName: '검은색', direction: '북쪽', digits: [1, 6] },
};

/** 상생: key가 value를 낳는다 */
export const GENERATES: Record<Element, Element> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

/** 상극: key가 value를 누른다 */
export const CONTROLS: Record<Element, Element> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};

export const motherOf = (e: Element): Element => ELEMENTS.find((x) => GENERATES[x] === e)!;
export const controllerOf = (e: Element): Element => ELEMENTS.find((x) => CONTROLS[x] === e)!;

export const STEMS: Record<string, { ko: string; element: Element; yang: boolean }> = {
  甲: { ko: '갑', element: 'wood', yang: true },
  乙: { ko: '을', element: 'wood', yang: false },
  丙: { ko: '병', element: 'fire', yang: true },
  丁: { ko: '정', element: 'fire', yang: false },
  戊: { ko: '무', element: 'earth', yang: true },
  己: { ko: '기', element: 'earth', yang: false },
  庚: { ko: '경', element: 'metal', yang: true },
  辛: { ko: '신', element: 'metal', yang: false },
  壬: { ko: '임', element: 'water', yang: true },
  癸: { ko: '계', element: 'water', yang: false },
};

export const BRANCHES: Record<string, { ko: string; element: Element; animal: string }> = {
  子: { ko: '자', element: 'water', animal: '쥐' },
  丑: { ko: '축', element: 'earth', animal: '소' },
  寅: { ko: '인', element: 'wood', animal: '호랑이' },
  卯: { ko: '묘', element: 'wood', animal: '토끼' },
  辰: { ko: '진', element: 'earth', animal: '용' },
  巳: { ko: '사', element: 'fire', animal: '뱀' },
  午: { ko: '오', element: 'fire', animal: '말' },
  未: { ko: '미', element: 'earth', animal: '양' },
  申: { ko: '신', element: 'metal', animal: '원숭이' },
  酉: { ko: '유', element: 'metal', animal: '닭' },
  戌: { ko: '술', element: 'earth', animal: '개' },
  亥: { ko: '해', element: 'water', animal: '돼지' },
};

/** 1~45 번호의 오행: 끝자리 기준 (하도 수리). 각 오행에 정확히 9개씩 배정됨 */
export function numberElement(n: number): Element {
  const d = n % 10;
  return ELEMENTS.find((e) => ELEMENT_INFO[e].digits.includes(d))!;
}

export const numbersOf = (e: Element): number[] =>
  Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => numberElement(n) === e);

/** 조사 처리: 목이/화가 */
export const withJosa = (word: string, withBatchim: string, without: string) => {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return word + without;
  return word + ((last - 0xac00) % 28 > 0 ? withBatchim : without);
};
