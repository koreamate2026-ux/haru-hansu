import { useCallback, useEffect, useState } from 'react';
import { REL_INFO, type FamilyRel } from './compatDetail';
import { KEYS, load, save } from './storage';

/**
 * 가족 궁합용 관계. "기준 사람 > 상대" 순서로 저장한다(엄마는 나에겐 엄마, 아빠에겐 배우자라서
 * 보는 사람마다 다르다). 반대 방향만 저장돼 있으면 거꾸로 바꿔 읽는다(엄마 → 자녀).
 */
type RelMap = Record<string, FamilyRel>;
const EVENT = 'ohaengsu:relations';
const keyOf = (baseId: string, otherId: string) => `${baseId}>${otherId}`;

export function relationBetween(map: RelMap, baseId: string, otherId: string): FamilyRel | null {
  const direct = map[keyOf(baseId, otherId)];
  if (direct) return direct;
  const reverse = map[keyOf(otherId, baseId)];
  return reverse ? REL_INFO[reverse].inverse : null;
}

export function saveRelation(baseId: string, otherId: string, rel: FamilyRel | null) {
  const map = load<RelMap>(KEYS.relations, {});
  delete map[keyOf(otherId, baseId)];
  if (rel) map[keyOf(baseId, otherId)] = rel;
  else delete map[keyOf(baseId, otherId)];
  save(KEYS.relations, map);
  window.dispatchEvent(new Event(EVENT));
}

/** 관계 목록을 읽고, 어디서 바뀌어도 다시 그린다 */
export function useRelations() {
  const [map, setMap] = useState<RelMap>(() => load<RelMap>(KEYS.relations, {}));
  useEffect(() => {
    const sync = () => setMap(load<RelMap>(KEYS.relations, {}));
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const get = useCallback((baseId: string, otherId: string) => relationBetween(map, baseId, otherId), [map]);
  return { get, set: saveRelation };
}
