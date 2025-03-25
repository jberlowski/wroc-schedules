export type Stop = {
  id: number;
  name: string;
  lines: LineVariant[];
};

export type Variant = 1 | 2;

export type LineVariant = {
  name: string;
  variant: Variant;
  destination: string;
  validFrom: Date;
  variantDescription: string;
  weekdayTT: string[];
  saturdayTT: string[];
  sundayTT: string[];
};

export class Stops {
  private stops: { [k: number]: Stop } = {};

  putOrAppend(id: number, name: string, line: LineVariant) {
    if (!this.stops[id]) {
      this.stops[id] = {
        id,
        name,
        lines: [line],
      };
    } else if (!this.stops[id].lines.includes(line)) {
      this.stops[id].lines.push(line);
    }
  }
}
