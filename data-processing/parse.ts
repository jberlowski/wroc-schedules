import { XMLParser } from "fast-xml-parser";
export type Rozklad = {
  linie: Linie;
};
export type Linie = {
  linia: Linia;
};

export type Linia = {
  "@nazwa": string;
  "@typ": string;
  "@wazny_od": string;
  wariant: Wariant | Wariant[];
};

export type Wariant = {
  "@id": string;
  "@nazwa": string;
  przystanek: Przystanek[];
};

export type Przystanek = {
  "@id": number;
  "@nazwa": string;
  "@ulica": string;
  tabliczka: Tabliczka | undefined;
};

export type Tabliczka = {
  dzien: Dzien[] | Dzien;
};

export type Dzien = {
  "@nazwa": "w dni robocze" | "Sobota" | "Niedziela";
  godz: Godz[] | Godz;
};

export type Godz = {
  "@h": number;
  min: Min[] | Min;
};

export type Min = {
  "@m": number;
};

export class RozkladParser {
  private options = {
    ignoreAttributes: false,
    attributeNamePrefix: "@", // you have assign this so use this to access the attribute
  };
  private xmlParser = new XMLParser(this.options);
  private decoder = new TextDecoder(); // Decode bytes to text

  async parseRozklad(filePath: string): Promise<Rozklad> {
    const filehandle = Deno.open(filePath);
    const buf = new Uint8Array(8000004);

    const file = await filehandle;
    const i = await file.read(buf);
    file.close();
    console.log("parsing ", filePath);

    const parsed = this.xmlParser.parse(
      this.decoder.decode(buf),
    );
    console.log("done reading", i, filePath);
    return parsed as Rozklad;
  }
}

export function getWariants(linia: Linia): Wariant[] {
  return Array.isArray(linia.wariant)
    ? [linia.wariant[0], linia.wariant[1]]
    : [linia.wariant];
}

export function getKierunek(wariant: Wariant) {
  const lastIndex = wariant.przystanek.length - 1;
  return wariant.przystanek[lastIndex]["@nazwa"];
}

export function flattenTimetableForDay(
  rodzaj: "w dni robocze" | "Sobota" | "Niedziela",
  tabliczka: Tabliczka | undefined,
): string[] {
  if (!tabliczka) {
    return [];
  }
  const dni = wrapToArray(tabliczka.dzien);
  const dzien = dni.find((it) => it["@nazwa"] === rodzaj);
  if (!dzien) {
    console.log(`${rodzaj} is not present in timetable`);
    console.log(`present ${dni.map((it) => it["@nazwa"])}`);
    return [];
  }

  return flattenDay(
    dzien.godz,
  );
}

export function flattenDay(hours: Godz[] | Godz): string[] {
  return wrapToArray(hours).map((godz) => {
    return wrapToArray(godz.min).map((min) => {
      return `${godz["@h"]}:${min["@m"]}`;
    });
  }).flat();
}

function wrapToArray<T>(input: T[] | T): T[] {
  return Array.isArray(input) ? input : [input];
}
