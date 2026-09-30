declare module 'lunar-javascript' {
  export interface EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    setSect(sect: 1 | 2): void;
    /** 1 = 남자, 0 = 여자 */
    getYun(gender: 0 | 1): Yun;
  }
  export interface Yun {
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    isForward(): boolean;
    getDaYun(n?: number): DaYun[];
  }
  export interface DaYun {
    getIndex(): number;
    getGanZhi(): string;
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getEndAge(): number;
  }
  export interface LunarDate {
    getEightChar(): EightChar;
    getDayInGanZhi(): string;
    getYearInGanZhi(): string;
    /** 입춘 기준 해의 간지 */
    getYearInGanZhiExact(): string;
    /** 절기 기준 달의 간지 */
    getMonthInGanZhiExact(): string;
    getSolar(): SolarDate;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    toString(): string;
  }
  export interface SolarDate {
    getLunar(): LunarDate;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    toYmd(): string;
  }
  export const Solar: {
    fromYmd(y: number, m: number, d: number): SolarDate;
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): SolarDate;
  };
  export const Lunar: {
    fromYmd(y: number, m: number, d: number): LunarDate;
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): LunarDate;
  };
}
