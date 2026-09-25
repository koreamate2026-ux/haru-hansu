declare module 'lunar-javascript' {
  export interface EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    setSect(sect: 1 | 2): void;
  }
  export interface LunarDate {
    getEightChar(): EightChar;
    getDayInGanZhi(): string;
    getYearInGanZhi(): string;
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
