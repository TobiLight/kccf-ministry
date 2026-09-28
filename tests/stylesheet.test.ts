import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

export type CssDeclaration = {
  property: string;
  value: string;
};

export type CssRule = {
  selector: string;
  conditions: string[];
  declarations: CssDeclaration[];
};

export const goldToken = "hsl(43 72% 47%)";

function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function readBlock(source: string, openIndex: number) {
  let depth = 0;

  for (let index = openIndex; index < source.length; index++) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return { body: source.slice(openIndex + 1, index), end: index + 1 };
      }
    }
  }

  return { body: source.slice(openIndex + 1), end: source.length };
}

function readString(source: string, startIndex: number) {
  const quote = source[startIndex];

  for (let index = startIndex + 1; index < source.length; index++) {
    if (source[index] === "\\") {
      index += 1;
    } else if (source[index] === quote) {
      return index + 1;
    }
  }

  return source.length;
}

function parseBlock(body: string) {
  const declarations: CssDeclaration[] = [];
  const children: { prelude: string; body: string }[] = [];
  let buffer = "";
  let cursor = 0;

  const flush = () => {
    const entry = buffer.trim();
    buffer = "";
    if (!entry || entry.startsWith("@")) return;

    const separator = entry.indexOf(":");
    declarations.push(
      separator === -1
        ? { property: entry, value: "" }
        : { property: entry.slice(0, separator).trim(), value: entry.slice(separator + 1).trim() },
    );
  };

  while (cursor < body.length) {
    const character = body[cursor];

    if (character === '"' || character === "'") {
      const end = readString(body, cursor);
      buffer += body.slice(cursor, end);
      cursor = end;
      continue;
    }

    if (character === "{") {
      const prelude = buffer.trim();
      buffer = "";
      const nested = readBlock(body, cursor);
      children.push({ prelude, body: nested.body });
      cursor = nested.end;
      continue;
    }

    if (character === ";") {
      flush();
      cursor += 1;
      continue;
    }

    buffer += character;
    cursor += 1;
  }

  flush();

  return { declarations, children };
}

export function parseStylesheet(css: string): CssRule[] {
  const rules: CssRule[] = [];

  const visit = (body: string, conditions: string[], preludeForDeclarations?: string) => {
    const { declarations, children } = parseBlock(body);

    if (preludeForDeclarations !== undefined && declarations.length > 0) {
      rules.push({ selector: preludeForDeclarations, conditions, declarations });
    }

    for (const child of children) {
      const normalized = child.prelude.replace(/\s+/g, " ");

      if (child.prelude.startsWith("@")) {
        visit(child.body, [...conditions, normalized], normalized);
        continue;
      }

      for (const selector of child.prelude.split(",")) {
        visit(child.body, conditions, selector.trim().replace(/\s+/g, " "));
      }
    }
  };

  visit(stripComments(css), []);

  return rules;
}

export function findRules(rules: CssRule[], selector: string, condition?: string | null) {
  return rules.filter((rule) => {
    if (rule.selector !== selector) return false;
    if (condition === undefined) return true;

    const chain = rule.conditions.filter((entry) => !entry.startsWith("@layer"));
    if (condition === null) return chain.length === 0;
    return chain.at(-1) === condition;
  });
}

export function findDeclarations(rules: CssRule[], selector: string, condition?: string | null) {
  return findRules(rules, selector, condition).flatMap((rule) => rule.declarations);
}

export function findValue(rules: CssRule[], selector: string, property: string, condition?: string | null) {
  return findDeclarations(rules, selector, condition)
    .filter((declaration) => declaration.property === property)
    .map((declaration) => declaration.value);
}

export async function readShippedStylesheet() {
  return readFile(new URL("../static/style.css", import.meta.url), "utf8");
}

export async function readSourceStylesheet() {
  return readFile(new URL("../src/input.css", import.meta.url), "utf8");
}

describe("shipped stylesheet contract", () => {
  test("ships centred section headings with an explicit text-align rule", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());

    expect(findValue(shipped, ".section-heading-center", "text-align")).toEqual(["center"]);
    expect(findValue(source, ".section-heading-center", "text-align")).toEqual(["center"]);
  });

  test("keeps the contact strip on brand gold at every breakpoint", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const backgrounds = findDeclarations(shipped, ".contact-strip")
      .filter((declaration) => declaration.property.startsWith("background"))
      .map((declaration) => declaration.value);

    expect(backgrounds.length).toBeGreaterThan(0);
    for (const background of backgrounds) {
      expect(background).toBe("var(--color-primary)");
    }
    expect(findValue(shipped, ".contact-strip", "background")).toEqual(["var(--color-primary)"]);
    expect(findValue(shipped, ".contact-strip", "display")).toEqual(["none", "block"]);
    expect(shipped.some((rule) => rule.declarations.some((declaration) => declaration.value.includes(goldToken)))).toBe(
      true,
    );
  });

  test("gives the pastor grid two columns from the 48rem breakpoint", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());

    expect(findValue(source, ".pastor-grid", "grid-template-columns", "@media (min-width: 48rem)")).toEqual([
      "repeat(2, minmax(0, 1fr))",
    ]);
    expect(findValue(shipped, ".pastor-grid", "grid-template-columns", "@media (min-width: 48rem)")).toEqual([
      "repeat(2, minmax(0, 1fr))",
    ]);
  });

  test("keeps the beliefs grid single column until 40rem and four columns from 64rem", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());

    for (const rules of [source, shipped]) {
      expect(findValue(rules, ".beliefs-grid", "grid-template-columns", null)).toEqual([]);
      expect(findValue(rules, ".beliefs-grid", "grid-template-columns", "@media (min-width: 40rem)")).toEqual([
        "repeat(2, minmax(0, 1fr))",
      ]);
      expect(findValue(rules, ".beliefs-grid", "grid-template-columns", "@media (min-width: 64rem)")).toEqual([
        "repeat(4, minmax(0, 1fr))",
      ]);
    }
  });

  test("carries the marquee clearance on the sequence so the track is exactly two sequence widths", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());

    for (const rules of [source, shipped]) {
      expect(findValue(rules, ".service-marquee-track", "width")).toEqual(["max-content"]);
      expect(findValue(rules, ".service-marquee-track", "padding-right")).toEqual([]);
      expect(findValue(rules, ".service-marquee-track", "padding")).toEqual([]);
      expect(findValue(rules, ".marquee-sequence", "padding-inline")).toEqual(["1rem 4.5rem"]);
      expect(findValue(rules, ".marquee-sequence", "flex-shrink")).toEqual(["0"]);
    }

    expect(findValue(shipped, ".service-marquee-track", "animation", null)).toEqual(["marquee 32s linear infinite"]);
  });

  test("hides the marquee control and stops the track under reduced motion", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());
    const reduced = "@media (prefers-reduced-motion: reduce)";

    for (const rules of [source, shipped]) {
      expect(findValue(rules, ".marquee-toggle", "display", reduced)).toEqual(["none"]);
      expect(findValue(rules, ".service-marquee-track", "animation", reduced)).toEqual(["none !important"]);
    }
  });

  test("ships motion utilities that never leave fade elements at opacity 0", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());
    const reduced = "@media (prefers-reduced-motion: reduce)";

    expect(findValue(shipped, ".animate-fade-up", "animation", null)).toEqual(["var(--animate-fade-up)"]);
    expect(findValue(shipped, ".animate-fade-in", "animation", null)).toEqual(["var(--animate-fade-in)"]);
    expect(findValue(shipped, ".animate-soft-bounce", "animation", null)).toEqual(["var(--animate-soft-bounce)"]);

    for (const rules of [source, shipped]) {
      const themeVariables = new Map(
        rules
          .filter((rule) => rule.selector === "@theme" || rule.selector.includes(":root"))
          .flatMap((rule) => rule.declarations)
          .map(({ property, value }) => [property, value]),
      );

      expect(themeVariables.get("--animate-fade-up")).toBe("fade-up 650ms ease backwards");
      expect(themeVariables.get("--animate-fade-in")).toBe("fade-in 650ms ease backwards");
      expect(themeVariables.get("--animate-soft-bounce")).toBe("soft-bounce 2.4s ease-in-out infinite");
      expect(themeVariables.get("--animate-bounce") ?? "").not.toContain("2.4s");
      expect(themeVariables.get("--color-primary")).toBe(goldToken);
      for (const utility of [".animate-fade-up", ".animate-fade-in", ".animate-soft-bounce"]) {
        expect(findValue(rules, utility, "animation", reduced)).toEqual(["none !important"]);
      }
    }

    const shippedCss = await readShippedStylesheet();
    for (const keyframe of ["fade-up", "fade-in", "soft-bounce", "marquee"]) {
      expect(shippedCss).toContain(`@keyframes ${keyframe}`);
    }
  });

  test("fully hardens the visually hidden utility", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());

    for (const rules of [source, shipped]) {
      const declarations = new Map(
        findDeclarations(rules, ".visually-hidden").map(({ property, value }) => [property, value]),
      );

      expect(declarations.get("position")).toBe("absolute");
      expect(declarations.get("width")).toBe("1px");
      expect(declarations.get("height")).toBe("1px");
      expect(declarations.get("margin")).toBe("-1px");
      expect(declarations.get("overflow")).toBe("hidden");
      expect(declarations.get("clip")).toBe("rect(0 0 0 0)");
      expect(declarations.get("clip-path")).toBe("inset(50%)");
      expect(declarations.get("border")).toBe("0");
      expect(declarations.get("padding")).toBe("0");
      expect(declarations.get("white-space")).toBe("nowrap");
    }
  });

  test("has no malformed declarations and no Google Fonts import in the source", async () => {
    const shippedCss = await readShippedStylesheet();
    const source = await readSourceStylesheet();

    expect(shippedCss).not.toMatch(/\bome=\s/);
    for (const rule of parseStylesheet(shippedCss)) {
      for (const declaration of rule.declarations) {
        expect(declaration.property).toMatch(/^[-a-z]+$/);
        expect(declaration.value).not.toContain("= ");
      }
    }
    expect(source).not.toContain("@import url(");
    expect(shippedCss).not.toContain("fonts.googleapis.com");
  });

  test("no longer carries the removed sermon date note rule", async () => {
    const source = parseStylesheet(await readSourceStylesheet());
    const shipped = parseStylesheet(await readShippedStylesheet());

    expect(findRules(source, ".sermon-date-note")).toEqual([]);
    expect(findRules(shipped, ".sermon-date-note")).toEqual([]);
  });

  test("styles the footer social links instead of leaving the class unstyled", async () => {
    for (const rules of [parseStylesheet(await readSourceStylesheet()), parseStylesheet(await readShippedStylesheet())]) {
      const declarations = new Map(
        findDeclarations(rules, ".social-links").map(({ property, value }) => [property, value]),
      );

      expect(declarations.get("display")).toBe("flex");
      expect(declarations.get("gap")).toBe("0.6rem");
      expect(declarations.get("margin-top")).toBe("1.5rem");
      expect(findValue(rules, ".social-links a", "width")).toEqual(["2.4rem"]);
      expect(findValue(rules, ".social-links a", "border-radius")).toEqual(["999px"]);
      expect(findValue(rules, ".social-links a:hover", "color")).toEqual(["var(--color-primary)"]);
      expect(findValue(rules, ".social-links a:focus-visible", "color")).toEqual(["var(--color-primary)"]);
    }
  });

  test("keeps the header brand logo circular and the wordmark visible", async () => {
    for (const rules of [parseStylesheet(await readSourceStylesheet()), parseStylesheet(await readShippedStylesheet())]) {
      expect(findValue(rules, ".brand-lockup", "display")).toEqual(["inline-flex"]);
      expect(findValue(rules, ".brand-lockup", "gap")).toEqual(["0.7rem"]);
      expect(findValue(rules, ".brand-logo-image", "border-radius")).toEqual(["999px"]);
      expect(findValue(rules, ".brand-logo-image", "border")).toEqual(["1px solid var(--color-primary)"]);
      expect(findValue(rules, ".brand-logo-image", "width")).toEqual(["3.4rem"]);
      expect(findValue(rules, ".brand-copy strong", "font-family")).toEqual(["var(--font-display)"]);
      expect(findRules(rules, ".brand-logo")).toEqual([]);
    }
  });

  test("declares the page hero once and drops the dead header grid", async () => {
    for (const rules of [parseStylesheet(await readSourceStylesheet()), parseStylesheet(await readShippedStylesheet())]) {
      const baseHeroRules = findRules(rules, ".page-hero", null);
      const heroDeclarations = baseHeroRules.flatMap((rule) => rule.declarations.map(({ property }) => property));

      expect(baseHeroRules).toHaveLength(1);
      expect(new Set(heroDeclarations).size).toBe(heroDeclarations.length);
      expect(findValue(rules, ".page-hero", "position", null)).toEqual(["relative"]);
      expect(findValue(rules, ".page-hero", "padding-block", null)).toEqual(["9rem 5rem"]);
      expect(findValue(rules, ".page-hero-image", "transition", null)).toEqual([
        "transform 500ms ease, box-shadow 500ms ease",
      ]);
      expect(findValue(rules, ".page-hero-image", "aspect-ratio", null)).toEqual(["4 / 3"]);
      expect(findRules(rules, ".site-header-grid")).toEqual([]);
    }
  });

  test("keeps the sermon player and archive contracts in both stylesheets", async () => {
    for (const rules of [parseStylesheet(await readSourceStylesheet()), parseStylesheet(await readShippedStylesheet())]) {
      expect(findValue(rules, ".sermon-player-frame", "aspect-ratio")).toEqual(["16 / 9"]);
      expect(findValue(rules, ".sermon-player-embed", "position")).toEqual(["absolute"]);
      expect(findValue(rules, ".sermon-facade", "position")).toEqual(["absolute"]);
      expect(findValue(rules, ".sermon-player-embed, .sermon-facade", "position")).toEqual([]);
      expect(findValue(rules, ".sermon-facade-play", "border-radius")).toEqual(["999px"]);
      expect(findValue(rules, ".sermon-archive", "display")).toEqual(["grid"]);
      expect(findValue(rules, ".sermon-row-badge", "text-transform")).toEqual(["uppercase"]);
      expect(findValue(rules, ".sermon-row-flag", "text-transform")).toEqual(["uppercase"]);
      expect(findValue(rules, ".sermon-row", "grid-template-columns", "@media (min-width: 48rem)")).toEqual([
        "minmax(0, 1fr) auto",
      ]);
    }
  });

  test("keeps the sermon player free of motion so reduced-motion needs no override", async () => {
    for (const rules of [parseStylesheet(await readSourceStylesheet()), parseStylesheet(await readShippedStylesheet())]) {
      const moving = findDeclarations(rules, ".sermon-player-frame").filter(
        (declaration) => declaration.property === "transition" || declaration.property === "animation",
      );

      expect(moving).toEqual([]);
    }
  });
});
