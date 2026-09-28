import { mkdir } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

const DEFAULT_WIDTHS = [640, 1024, 1600];

type Options = {
  source: string;
  baseName: string;
  widths: number[];
  outDir: string;
  srcWidth?: number;
  force: boolean;
  constName?: string;
};

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function toCamelCase(value: string) {
  return value.replace(/[^a-zA-Z0-9]+(.)?/g, (_match, char: string | undefined) => (char ? char.toUpperCase() : ""));
}

function parseArgs(argv: string[]): Options {
  const positional: string[] = [];
  let widths = DEFAULT_WIDTHS;
  let outDir = "public/static/images";
  let srcWidth: number | undefined;
  let force = false;
  let constName: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (value === undefined) fail(`${arg} requires a value`);
      index += 1;
      return value;
    };

    if (arg === "--widths") {
      widths = next()
        .split(",")
        .map((part) => {
          const trimmed = part.trim();
          if (!/^\d+$/.test(trimmed)) fail(`invalid width: "${part}" — expected a positive integer`);
          const width = Number.parseInt(trimmed, 10);
          if (width === 0) fail(`invalid width: "${part}" — expected a positive integer`);
          return width;
        });
      continue;
    }

    if (arg === "--out") {
      outDir = next();
      continue;
    }

    if (arg === "--src-width") {
      const raw = next();
      if (!/^\d+$/.test(raw)) fail(`invalid --src-width: "${raw}"`);
      srcWidth = Number.parseInt(raw, 10);
      continue;
    }

    if (arg === "--const-name") {
      constName = next();
      continue;
    }

    if (arg === "--force") {
      force = true;
      continue;
    }

    positional.push(arg);
  }

  const [source, baseName] = positional;
  if (!source || !baseName) {
    fail("usage: image-variants <source> <base-name> [--widths 640,1024,1600] [--out public/static/images] [--src-width N] [--const-name name] [--force]");
  }

  // A repeated width would emit a duplicate descriptor, which a pasted srcset
  // must never contain, so drop repeats before anything is generated.
  const uniqueWidths = [...new Set(widths)].sort((a, b) => a - b);

  return { source: source!, baseName: baseName!, widths: uniqueWidths, outDir, srcWidth, force, constName };
}

async function run(command: string[]): Promise<string> {
  const proc = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) fail(`${command[0]} exited ${code}: ${stderr.trim()}`);
  return stdout;
}

async function readJpegSize(path: string): Promise<{ width: number; height: number }> {
  const out = await run([
    "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path,
  ]);
  const [width, height] = out.trim().split(",").map((part) => Number.parseInt(part.trim(), 10));
  if (!width || !height) fail(`could not read JPEG dimensions from ${path} (got "${out.trim()}")`);
  return { width: width!, height: height! };
}

function scaleExpression(width: number): string {
  return `scale=${width}:-2:flags=lanczos`;
}

const options = parseArgs(Bun.argv.slice(2));
const sourcePath = resolve(options.source);
const sourceSize = await readJpegSize(sourcePath).catch(() => fail(`cannot read source image: ${options.source}`));

const srcWidth = options.srcWidth ?? sourceSize.width;
if (srcWidth > sourceSize.width) {
  fail(`--src-width ${srcWidth} is larger than the source (${sourceSize.width}px); refusing to upscale`);
}

for (const width of options.widths) {
  if (width > sourceSize.width) {
    fail(`requested width ${width} is larger than the source (${sourceSize.width}px); refusing to upscale`);
  }
}

// A width equal to srcWidth is the full-size file's job, so it is never emitted twice.
const variantWidths = options.widths.filter((width) => width < srcWidth);
const skipped = options.widths.filter((width) => width >= srcWidth);

const outDir = resolve(options.outDir);
const srcFile = `${options.baseName}.jpg`;
const srcTarget = join(outDir, srcFile);
const srcExists = await Bun.file(srcTarget).exists();

// The full-size file is the one output that cannot be re-derived safely, so it is
// never overwritten without --force. Refusing unconditionally is stricter than
// comparing widths and still covers a genuine native original of a different size.
if (srcExists && !options.force) {
  const existing = await readJpegSize(srcTarget);
  fail(
    `${options.outDir}/${srcFile} already exists at ${existing.width}px. ` +
      `The full-size file is never overwritten without --force, so a native original cannot be lost to a re-encode. ` +
      `Re-run with --force to replace it deliberately, or pick another --out.`,
  );
}

await mkdir(outDir, { recursive: true });

const generated: Array<{ file: string; width: number }> = [];

for (const width of variantWidths) {
  const file = `${options.baseName}-${width}.jpg`;
  await run(["ffmpeg", "-y", "-nostdin", "-i", sourcePath, "-vf", scaleExpression(width), "-q:v", "4", join(outDir, file)]);
  const size = await readJpegSize(join(outDir, file));
  if (size.width !== width) fail(`${file} is ${size.width}px wide but ${width} was requested; check for EXIF rotation`);
  generated.push({ file, width });
}

await run([
  "ffmpeg",
  options.force ? "-y" : "-n",
  "-nostdin",
  "-i",
  sourcePath,
  "-vf",
  scaleExpression(srcWidth),
  "-q:v",
  "4",
  srcTarget,
]);
const finalSrcSize = await readJpegSize(srcTarget);
if (finalSrcSize.width !== srcWidth) fail(`${srcFile} is ${finalSrcSize.width}px wide but ${srcWidth} was requested`);

const identifier = options.constName ?? `${toCamelCase(options.baseName)}Srcset`;
if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(identifier)) {
  fail(`"${identifier}" is not a valid JavaScript identifier; pass --const-name with a valid name`);
}

// public/ is served from the project root, so a --out inside the project has a real
// public path. A --out outside it has no URL yet, so fall back to the intended
// destination and say loudly that the files are not there.
const relativeOut = relative(resolve(import.meta.dir, ".."), outDir);
const servable = relativeOut !== "" && !relativeOut.startsWith("..") && !isAbsolute(relativeOut);
const servedDir = servable ? `/${relativeOut.split(sep).join("/")}` : "/static/images";
const publicPath = (file: string) => `${servedDir}/${file}`;

if (!servable) {
  console.warn(
    `warning: --out ${options.outDir} is outside the project, so nothing is served at the paths below. ` +
      `Move the files into public/static/images before pasting this block.`,
  );
}

console.log("");
console.log(`// paste into imageAssetMap in src/content/site.ts`);
// Ascending by descriptor, matching the committed ladders and the
// ascending-order contract the asset tests enforce on every srcset.
const candidates = [
  { file: srcFile, width: finalSrcSize.width },
  ...generated,
].sort((a, b) => a.width - b.width);

console.log(`const ${identifier} = [`);
for (const entry of candidates) {
  console.log(`  "${publicPath(entry.file)} ${entry.width}w",`);
}
console.log(`].join(", ");`);
console.log("");
console.log(`  src: "${publicPath(srcFile)}",`);
console.log(`  width: ${finalSrcSize.width},`);
console.log(`  height: ${finalSrcSize.height},`);
console.log(`  // sizes is a layout judgement — set it by hand, e.g. "(min-width: 64rem) 38rem, 92vw"`);
console.log("");

if (skipped.length > 0) {
  console.log(`note: skipped width(s) ${skipped.join(", ")} because they are not narrower than --src-width ${srcWidth}.`);
}
if (!srcExists) {
  console.log(`note: created ${options.outDir}/${srcFile}; pass --force to replace it in future runs.`);
}
