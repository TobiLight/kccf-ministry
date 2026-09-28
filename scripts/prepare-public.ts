import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULT_SRC = "static";
const DEFAULT_OUT = "public";

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let src = DEFAULT_SRC;
  let out = DEFAULT_OUT;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (value === undefined) fail(`${arg} requires a value`);
      index += 1;
      return value;
    };

    if (arg === "--out") {
      out = next();
      continue;
    }

    if (arg === "--src") {
      src = next();
      continue;
    }

    fail(`unknown argument: "${arg}"`);
  }

  return { src, out };
}

async function countFiles(dir: string): Promise<number> {
  let total = 0;

  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      total += await countFiles(join(dir, entry.name));
    } else if (entry.isFile()) {
      total += 1;
    }
  }

  return total;
}

const options = parseArgs(Bun.argv.slice(2));
const src = resolve(options.src);
const out = resolve(options.out);

// Vercel serves public/** from its CDN and ignores Hono's serveStatic(), so this mirror is
// the only way the CSS, the vendored Datastar runtime, and the images reach a production
// visitor. A missing source must abort the build rather than quietly publish a site with no
// stylesheet and no JavaScript, which would render but silently lose every interaction.
if (!(await stat(src).catch(() => null))?.isDirectory()) {
  fail(`static source directory not found: ${options.src}`);
}

const dest = join(out, "static");

// Wipe first. A plain overlay copy would let an asset deleted from static/ survive here as a
// stale CDN file, which is exactly the kind of failure no test on the Hono path can see.
await rm(dest, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(src, dest, { recursive: true });

const copied = await countFiles(dest);

console.log(`mirrored ${options.src} -> ${join(options.out, "static")} (${copied} files)`);
