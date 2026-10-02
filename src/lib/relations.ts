import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { REL_INFO, type FamilyRel } from './compatDetail';
import { KEYS, load, save } from './storage';

/**
 * 가족 궁합용 관계. "기준 사람 > 상대" 순서로 저장한다(예: 재호 > 엄마 = mother).
 * 반대 방향만 있으면 거꾸로 바꿔 읽는다(엄마 > 재호 = 자녀).
 * 로그인해 가족 그룹을 쓰는 중이면 그룹(서버)에 저장해 가족 모두가 같은 관계·같은 점수를 본다.
 * 이 기기에도 복사본을 둬서 오프라인이나 서버 저장 전에도 바로 보인다.
 */
type RelMap = Record<string, FamilyRel>;
const EVENT = 'ohaengsu:relations';
const keyOf = (baseId: string, otherId: string) => `${baseId}>${otherId}`;

let ctx: { householdId: string; token: string } | null = null;

const read = () => load<RelMap>(KEYS.relations, {});
function write(map: RelMap) {
  save(KEYS.relations, map);
  window.dispatchEvent(new Event(EVENT));
}

export function relationBetween(map: RelMap, baseId: string, otherId: string): FamilyRel | null {
  const direct = map[keyOf(baseId, otherId)];
  if (direct) return direct;
  const reverse = map[keyOf(otherId, baseId)];
  return reverse ? REL_INFO[reverse].inverse : null;
}

/** 서버에 올린다. 아직 서버 id를 받지 못한 사람(새로 만든 직후)은 실패하니 이 기기에만 남기고, id가 바뀔 때 다시 올린다 */
function push(baseId: string, otherId: string, rel: FamilyRel | null) {
  if (!ctx) return;
  api.putRelation(ctx.householdId, baseId, otherId, rel, ctx.token).catch(() => {});
}

export function saveRelation(baseId: string, otherId: string, rel: FamilyRel | null) {
  const map = read();
  delete map[keyOf(otherId, baseId)];
  if (rel) map[keyOf(baseId, otherId)] = rel;
  else delete map[keyOf(baseId, otherId)];
  write(map);
  push(baseId, otherId, rel);
}

/**
 * 가족 그룹이 정해지면(또는 바뀌면) 서버의 관계로 맞춘다.
 * 서버에 아직 없는 이 기기의 관계(예전 버전에서 정한 것)는 서버로 올려서 가족과 함께 쓴다.
 */
export async function syncRelations(householdId: string | null, token: string | null, personIds: string[]) {
  ctx = householdId && token ? { householdId, token } : null;
  if (!ctx) return;
  try {
    const list = await api.listRelations(householdId!, token!);
    const server: RelMap = {};
    for (const r of list) server[keyOf(r.fromPersonId, r.toPersonId)] = r.rel as FamilyRel;
    const ids = new Set(personIds);
    const local = read();
    for (const [k, rel] of Object.entries(local)) {
      const [a, b] = k.split('>');
      // 이 그룹 사람끼리의 관계인데 서버에 (어느 방향으로도) 없으면 올린다
      if (ids.has(a) && ids.has(b) && !server[k] && !server[keyOf(b, a)]) {
        server[k] = rel;
        push(a, b, rel);
      }
    }
    write(server);
  } catch {
    // 서버에서 못 받아오면 이 기기 복사본으로 계속 보여 준다
  }
}

/** 새로 만든 사람이 서버 id를 받으면 관계도 새 id로 옮기고 서버에 올린다 */
export function remapRelationId(oldId: string, newId: string) {
  const map = read();
  let changed = false;
  for (const [k, rel] of Object.entries(map)) {
    const [a, b] = k.split('>');
    if (a !== oldId && b !== oldId) continue;
    delete map[k];
    const na = a === oldId ? newId : a;
    const nb = b === oldId ? newId : b;
    map[keyOf(na, nb)] = rel;
    push(na, nb, rel);
    changed = true;
  }
  if (changed) write(map);
}

/** 관계 목록을 읽고, 어디서 바뀌어도 다시 그린다 */
export function useRelations() {
  const [map, setMap] = useState<RelMap>(read);
  useEffect(() => {
    const sync = () => setMap(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const get = useCallback((baseId: string, otherId: string) => relationBetween(map, baseId, otherId), [map]);
  return { get, set: saveRelation };
}
