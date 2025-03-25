import { LineVariant, Stops } from "./stops.ts";
import {
  flattenTimetableForDay,
  getKierunek,
  getWariants,
  RozkladParser,
  Wariant,
} from "./parse.ts";
const stops: Stops = new Stops();

async function entryPoint() {
  const parser = new RozkladParser();
  if (!Deno.args[0]) {
    console.error("Error: No input path provided.");
    Deno.exit(1);
  }
  if (!Deno.args[1]) {
    console.error("Error: No output path provided.");
    Deno.exit(1);
  }

  const path = Deno.args[0];
  const outPath = Deno.args[1];
  try {
    const f = await traverseInputFolders(path);
    if (f.length === 0) {
      console.warn("Warning: No XML files found.");
    }

    const s = f.map((it) => {
      return parser.parseRozklad(it);
    })
      .map(async (rozkladPr) => {
        const rozklad = await rozkladPr;

        return getWariants(rozklad.linie.linia).map((wariant) => {
          const lineWithVariant: [string, Date, Wariant] = [
            rozklad.linie.linia["@nazwa"],
            parseDate(rozklad.linie.linia["@wazny_od"]),
            wariant,
          ];
          return lineWithVariant;
        });
      });

    Promise.all(s).then((it) => {
      it.flat().flatMap(([name, validFrom, variant]) => {
        variant.przystanek.forEach((przystanek) => {
          console.log(przystanek["@nazwa"], name, variant["@id"]);
          const lineVariant: LineVariant = {
            name: name,
            destination: getKierunek(variant),
            variant: przystanek["@id"] == 1 ? 1 : 2,
            validFrom: validFrom,
            variantDescription: variant["@nazwa"],
            weekdayTT: flattenTimetableForDay(
              "w dni robocze",
              przystanek.tabliczka,
            ),
            saturdayTT: flattenTimetableForDay("Sobota", przystanek.tabliczka),
            sundayTT: flattenTimetableForDay("Niedziela", przystanek.tabliczka),
          };
          stops.putOrAppend(
            przystanek["@id"],
            przystanek["@nazwa"],
            lineVariant,
          );
        });
      });
      Deno.writeTextFileSync(outPath, JSON.stringify(stops));
    });
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`Error: Failed to read dir ectory "${path}".`);
      console.error(error.message);
    }
    Deno.exit(1);
  }
}

function parseDate(dateString: string) {
  const [day, month, year] = dateString.split(".").map(Number);
  return new Date(year, month - 1, day); // Month is 0-based in JS
}

async function traverseInputFolders(
  path: string,
  files: string[] = [],
): Promise<string[]> {
  for await (const value of Deno.readDir(path)) {
    if (value.isFile && value.name.endsWith(".xml")) {
      files.push(`${path}/${value.name}`);
    } else if (value.isDirectory) {
      files.push(...await traverseInputFolders(`${path}/${value.name}`));
    }
  }
  return files;
}

entryPoint();
