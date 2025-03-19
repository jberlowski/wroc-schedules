import { XMLParser } from "fast-xml-parser";

async function entryPoint() {
  const xmlParser = new XMLParser();
  const decoder = new TextDecoder(); // Decode bytes to text

  if (!Deno.args[0]) {
    console.error("Error: No path provided.");
    Deno.exit(1);
  }

  const path = Deno.args[0];
  try {
    const output: string[] = [];
    const f = await traverseInputFolders(path);
    if (f.length === 0) {
      console.warn("Warning: No XML files found.");
    }

    f.map((it) => Deno.open(it))
      .map(async (it) => {
        const i = await it;
        const buf = new Uint8Array(100000);
        await i.read(buf);
        i.close();
        const parsed = xmlParser.parse(decoder.decode(buf));

        console.log(parsed["linie"]["linia"]);
      });
    //await Promise.all(f.map(async (file) => {
    //  console.log(file);
    //  const fileHandle = await Deno.open(file, { read: true }); // Open file in read mode
    //  const decoder = new TextDecoder(); // Decode bytes to text
    //  const buf = new Uint8Array(1000);
    //  // Read file content
    //  await (fileHandle.read(buf));
    //  fileHandle.close(); // Always close the file
    //
    //  // Convert buffer to string
    //  const xmlString = decoder.decode(buf);
    //
    //  // Parse XML
    //  const parsed = xmlParser.parse(xmlString);
    //
    //  console.log(parsed, xmlString);
    //}));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`Error: Failed to read dir ectory "${path}".`);
      console.error(error.message);
    }
    Deno.exit(1);
  }
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
