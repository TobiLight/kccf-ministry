import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULT_WIDTHS = [640, 1024, 1600];

type Options = {
  source: string;
  baseName: string;
  widths: number[];
  outDir: string;
};

function parseArgs(argv: string[]): Options {
  const positional: string[] = [];
  let widths = DEFAULT_WIDTHS;
  let outDir = "static/images";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--widths") {
      const value = argv[index + 1];
      if (!value) throw new Error("--widths requires a comma-separated list, e.g. --widths 640,1024");
      widths = value.split(",").map((part) => Number.parseInt(part.trim(), 10));
      index += 1;
      continue;
    }

    if (arg === "--out") {
      const value = argv[index + 1];
      if (!value) throw new Error("--out requires a directory, e.g. --out static/images");
      outDir = value;
      index += 1;
      continue;
    }

    positional.push(arg);
  }

  const [source, baseName] = positional;

  if (!source || !baseName) {
    throw new Error("usage: image-variants <source> <base-name> [--widths 640,1024,1600] [--out static/images]");
  }

  for (const width of widths) {
    if (!Number.isInteger(width) || width <= 0) throw new Error(`invalid width: ${width}`);
  }

  return { source, baseName, widths, outDir };
}

async function run(command: string[]): Promise<string> {
  const proc = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;

  if (code !== 0) throw new Error(`${command[0]} exited ${code}: ${stderr.trim()}`);

  return stdout;
}

async function readJpegSize(path: string): Promise<{ width: number; height: number }> {
  const out = await run([
    "ffprobe",
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0",
    path,
  ]);
  const [width, height] = out.trim().split(",").map((part) => Number.parseInt(part.trim(), 10));

  if (!width || !height) throw new Error(`could not read JPEG dimensions from ${path} (got "${out.trim()}")`);

  return { width, height };
}

async function readRotationTag(path: string): Promise<string> {
  const out = await run([
    "ffprobe",
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream_tags=rotate:stream_side_data=rotation",
    "-of",
    "default=nw=1:nk=1",
    path,
  ]);
  return out.trim();
}

function scaleExpression(width: number): string {
  // Round the height to an even number so the encoder gets well-formed chroma planes.
  return `scale=${width}:-2:flags=lanczos`;
}

const options = parseArgs(Bun.argv.slice(2));
const sourcePath = resolve(options.source);
const outDir = resolve(options.outDir);

await mkdir(outDir, { recursive: true });

const rotation = await readRotationTag(sourcePath);
if (rotation && rotation !== "0" && !/Rotate: 0/.test(rotation)) {
  console.warn(
    `warning: ${options.source} carries a rotation tag (${rotation}). Confirm the printed width/height match the upright image.`,
  );
}

const generated: Array<{ file: string; width: number }> = [];

for (const width of options.widths) {
  const file = `${options.baseName}-${width}.jpg`;
  const target = join(outDir, file);

  await run(["ffmpeg", "-y", "-i", sourcePath, "-vf", scaleExpression(width), "-q:v", "4", target]);

  const size = await readJpegSize(target);
  if (size.width !== width) {
    throw new Error(`${file} is ${size.width}px wide but ${width} was requested; check for EXIF rotation`);
  }

  generated.push({ file, width });
}

const srcWidth = Math.max(...options.widths);
const srcFile = `${options.baseName}.jpg`;
const srcTarget = join(outDir, srcFile);

await run(["ffmpeg", "-y", "-i", sourcePath, "-vf", scaleExpression(srcWidth), "-q:v", "4", srcTarget]);

const srcSize = await readJpegSize(srcTarget);

console.log("");
console.log(`// paste into imageAssetMap in src/content/site.ts`);
console.log(`const ${options.baseName}Srcset = [`);
for (const entry of generated) {
  console.log(`  "/static/images/${entry.file} ${entry.width}w",`);
}
console.log(`  "/static/images/${srcFile} ${srcSize.width}w",`);
console.log(`].join(", ");`);
console.log("");
console.log(`  src: "/static/images/${srcFile}",`);
console.log(`  width: ${srcSize.width},`);
console.log(`  height: ${srcSize.height},`);
console.log("");
