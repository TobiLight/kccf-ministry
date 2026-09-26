import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { createApp } from "../src/index";
import { imageAssets } from "../src/content/site";

const imageFiles = [
  "about.jpg",
  "prayer-fellowship.jpg",
  "worship-moment.jpg",
  "bible-study.jpg",
  "pastor-1.jpg",
  "pastor-2.jpg",
  "logo.jpg",
] as const;

const generatedVariants = [
  { file: "about-640.jpg", width: 640 },
  { file: "about-1024.jpg", width: 1024 },
  { file: "about-1600.jpg", width: 1600 },
  { file: "about-2400.jpg", width: 2400 },
  { file: "hero-640.jpg", width: 640 },
  { file: "hero-1024.jpg", width: 1024 },
  { file: "hero-1600.jpg", width: 1600 },
  { file: "worship-moment-640.jpg", width: 640 },
  { file: "worship-moment-1024.jpg", width: 1024 },
  { file: "worship-moment-1600.jpg", width: 1600 },
  { file: "prayer-fellowship-640.jpg", width: 640 },
  { file: "prayer-fellowship-1024.jpg", width: 1024 },
  { file: "prayer-fellowship-1600.jpg", width: 1600 },
] as const;

const aboutVariants = generatedVariants.filter((variant) => variant.file.startsWith("about-"));

async function expectJpeg(pathname: string) {
  const response = await createApp().request(pathname);
  const body = await response.arrayBuffer();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/jpeg");
  expect(body.byteLength).toBeGreaterThan(0);
  expect(new Uint8Array(body, 0, 3)).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
  expect(new Uint8Array(body, body.byteLength - 2, 2)).toEqual(new Uint8Array([0xff, 0xd9]));

  return body.byteLength;
}

function readJpegDimensions(bytes: Uint8Array) {
  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

    if (isStartOfFrame) {
      return { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
    }

    offset += 2 + ((bytes[offset + 2] << 8) | bytes[offset + 3]);
  }

  throw new Error("no JPEG start-of-frame marker found");
}

describe("local ministry image assets", () => {
  for (const filename of imageFiles) {
    test(`serves ${filename} as a non-empty JPEG`, async () => {
      await expectJpeg(`/static/images/${filename}`);
    });
  }
});

describe("responsive image variants", () => {
  for (const variant of generatedVariants) {
    test(`serves ${variant.file} as a non-empty JPEG`, async () => {
      await expectJpeg(`/static/images/${variant.file}`);
    });
  }

  test("declares every generated variant width on the assets that ship them", () => {
    for (const [name, asset] of Object.entries(imageAssets)) {
      if (!asset.srcset) continue;
      const candidates = asset.srcset.split(", ").map((candidate) => {
        const [url, descriptor] = candidate.split(" ");
        return { url, width: Number(descriptor.replace("w", "")) };
      });

      expect(candidates.length).toBeGreaterThan(1);
      expect(asset.sizes).toBeTruthy();
      for (const candidate of candidates) {
        expect(candidate.url).toMatch(/^\/static\/images\/.+\.jpg$/);
        expect(candidate.width).toBeLessThanOrEqual(asset.width);
        if (candidate.url === asset.src) {
          expect(candidate.width).toBe(asset.width);
          continue;
        }
        const declared = generatedVariants.find((variant) => variant.file === candidate.url.split("/").pop());
        expect(declared, `${name} references unknown variant ${candidate.url}`).toBeDefined();
        expect(declared?.width as number | undefined).toBe(candidate.width);
      }
    }
  });

  test("keeps a full-bleed hero variant set for the home page LCP image", () => {
    expect(imageAssets.hero.src).toBe("/static/images/hero.jpg");
    expect(imageAssets.hero.sizes).toBe("100vw");
    expect(imageAssets.hero.srcset).toBe(
      "/static/images/hero-640.jpg 640w, /static/images/hero-1024.jpg 1024w, /static/images/hero-1600.jpg 1600w, /static/images/hero.jpg 2048w",
    );
  });

  test("declares every generated variant on the about image asset", () => {
    const { srcset, sizes } = imageAssets.about;

    expect(srcset).toBeDefined();
    expect(sizes).toBeDefined();

    const candidates = (srcset ?? "").split(", ").map((candidate) => {
      const [url, descriptor] = candidate.split(" ");
      return { url, descriptor };
    });

    expect(candidates).toHaveLength(aboutVariants.length);
    expect(candidates.map((candidate) => candidate.descriptor)).toEqual(["640w", "1024w", "1600w", "2400w"]);
    for (const variant of aboutVariants) {
      expect(candidates.some((candidate) => candidate.url === `/static/images/${variant.file}`)).toBe(true);
    }
  });

  test("keeps the original full-size hero as the local fallback", () => {
    const { src, width, height } = imageAssets.about;

    expect(src).toBe("/static/images/about.jpg");
    expect(width).toBe(4389);
    expect(height).toBe(3292);
  });
});

describe("vendored Datastar runtime", () => {
  test("ships no source map reference and no source map file", async () => {
    const vendored = await readFile(new URL("../static/datastar.js", import.meta.url), "utf8");

    expect(vendored).not.toContain("sourceMappingURL");
    expect(vendored).not.toContain("datastar.js.map");
    expect(vendored.endsWith("\n")).toBe(true);
    expect(existsSync(new URL("../static/datastar.js.map", import.meta.url))).toBe(false);
  });

  test("serves the runtime without a source map reference and 404s the map URL", async () => {
    const response = await createApp().request("/static/datastar.js");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).not.toContain("sourceMappingURL");
    expect(body).not.toContain("datastar.js.map");

    const map = await createApp().request("/static/datastar.js.map");
    expect(map.status).toBe(404);
  });
});

describe("image asset metadata", () => {
  test("every asset's declared dimensions match its real JPEG dimensions", async () => {
    for (const asset of Object.values(imageAssets)) {
      const response = await createApp().request(asset.src);
      const bytes = new Uint8Array(await response.arrayBuffer());

      expect(readJpegDimensions(bytes)).toEqual({ width: asset.width, height: asset.height });
    }
  });

  test("every generated variant matches its declared width", async () => {
    for (const variant of generatedVariants) {
      const response = await createApp().request(`/static/images/${variant.file}`);
      const bytes = new Uint8Array(await response.arrayBuffer());

      expect(readJpegDimensions(bytes).width).toBe(variant.width);
    }
  });
});
