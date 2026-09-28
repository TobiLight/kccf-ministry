import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { app } from "../src/index";
import { findChrome, startBrowser, type BrowserSession } from "./support/browser";

setDefaultTimeout(60_000);

const chromePath = findChrome();

if (!chromePath) {
  console.warn(
    "WARNING: real browser smoke suite SKIPPED - no Chrome or Chromium binary is discoverable, so its 6 tests did not run. Set KCCF_CHROME_PATH to a Chrome or Chromium executable to run them.",
  );
}

describe.skipIf(!chromePath)("real browser smoke", () => {
  let browser: Awaited<ReturnType<typeof startBrowser>>;
  let page: BrowserSession;

  beforeAll(async () => {
    browser = await startBrowser(app.fetch);
    page = browser.session;
  });

  afterAll(async () => {
    await browser?.session.close();
  });

  test("loads the Datastar module and keeps the page free of script and CSP errors", async () => {
    await page.open("/");

    expect(browser.statusFor("/static/datastar.js")).toBe(200);

    const marker = await page.evaluate<{ moduleTag: boolean; datastarListener: string; windowFetch: string }>(`
      (async () => {
        const datastarListener = await new Promise((resolve) => {
          document.addEventListener("datastar-fetch", () => resolve("live"), { once: true });
          document.dispatchEvent(new CustomEvent("datastar-fetch", { detail: { type: "kccf-probe", argsRaw: [] } }));
          setTimeout(() => resolve("absent"), 250);
        });
        return {
          moduleTag: Boolean(document.querySelector('script[type="module"][src="/static/datastar.js"]')),
          datastarListener,
          windowFetch: typeof window.fetch,
        };
      })()
    `);

    expect(marker.moduleTag).toBe(true);
    expect(marker.datastarListener).toBe("live");
    expect(marker.windowFetch).toBe("function");
    expect(page.requests.some((request) => request.url.endsWith("datastar.js.map"))).toBe(false);
    expect(page.requests.some((request) => request.url.endsWith(".map"))).toBe(false);
    expect(page.problems).toEqual([]);
  });

  test("toggles the mobile navigation from the header trigger", async () => {
    await page.setMobileViewport(390, 844);
    await page.open("/");

    const before = await page.evaluate<{ expanded: string | null; visible: boolean }>(`
      (() => {
        const trigger = document.getElementById("mobile-menu-trigger");
        const menu = document.getElementById("mobile-navigation");
        return { expanded: trigger.getAttribute("aria-expanded"), visible: menu.getClientRects().length > 0 };
      })()
    `);

    expect(before).toEqual({ expanded: "false", visible: false });

    const after = await page.evaluate<{ expanded: string | null; visible: boolean; label: string | null }>(`
      (async () => {
        const trigger = document.getElementById("mobile-menu-trigger");
        const menu = document.getElementById("mobile-navigation");
        trigger.click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        return {
          expanded: trigger.getAttribute("aria-expanded"),
          visible: menu.getClientRects().length > 0,
          label: trigger.getAttribute("aria-label"),
        };
      })()
    `);

    expect(after.expanded).toBe("true");
    expect(after.visible).toBe(true);
    expect(after.label).toBe("Close navigation menu");
    expect(page.problems).toEqual([]);
  });

  test("pauses and resumes the service marquee from a labelled toggle", async () => {
    await page.open("/");

    const marquee = await page.evaluate<{
      before: { pressed: string | null; paused: boolean; visibleLabel: string };
      paused: { pressed: string | null; name: string | null; paused: boolean; visibleLabel: string };
      resumed: { pressed: string | null; paused: boolean; visibleLabel: string };
    }>(`
      (async () => {
        const read = () => {
          const toggle = document.querySelector(".marquee-toggle");
          const marquee = document.querySelector(".service-marquee");
          const visibleLabel = [...toggle.querySelectorAll("span")]
            .filter((span) => span.getClientRects().length > 0)
            .map((span) => span.textContent.trim())
            .join(" ");
          return {
            pressed: toggle.getAttribute("aria-pressed"),
            name: toggle.getAttribute("aria-label"),
            paused: marquee.classList.contains("is-paused"),
            visibleLabel,
          };
        };
        const before = read();
        document.querySelector(".marquee-toggle").click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        const paused = read();
        document.querySelector(".marquee-toggle").click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        const resumed = read();
        return { before, paused, resumed };
      })()
    `);

    expect(marquee.before.pressed).toBe("false");
    expect(marquee.before.paused).toBe(false);
    expect(marquee.before.visibleLabel).toBe("Pause");
    expect(marquee.paused.pressed).toBe("true");
    expect(marquee.paused.paused).toBe(true);
    expect(marquee.paused.visibleLabel).toBe("Play");
    expect(marquee.paused.name?.toLowerCase()).toContain(marquee.paused.visibleLabel.toLowerCase());
    expect(marquee.paused.name?.toLowerCase()).toContain(marquee.before.visibleLabel.toLowerCase());
    expect(marquee.resumed.pressed).toBe("false");
    expect(marquee.resumed.paused).toBe(false);
    expect(marquee.resumed.visibleLabel).toBe("Pause");
    expect(page.problems).toEqual([]);
  });

  test("previews the contact form locally without sending a request", async () => {
    await page.open("/contact");

    const result = await page.evaluate<{
      disabledWhileLoading: boolean;
      loadingVisible: boolean;
      loadingText: string;
      successVisible: boolean;
      successText: string;
      cleared: boolean;
      path: string;
    }>(`
      (async () => {
        const fill = (id, value) => {
          const field = document.getElementById(id);
          field.value = value;
          field.dispatchEvent(new Event("input", { bubbles: true }));
        };
        fill("full-name", "Ada Test");
        fill("email", "ada@example.com");
        fill("phone", "+2348000000000");
        fill("subject", "Visit");
        fill("message", "Hello there");
        const button = document.querySelector(".form-submit button");
        const loading = document.querySelector(".form-submit-loading");
        const success = document.querySelector(".form-status p");
        button.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        const disabledWhileLoading = button.disabled === true;
        const loadingVisible = loading.getClientRects().length > 0;
        const loadingText = loading.textContent.trim();
        await new Promise((resolve) => setTimeout(resolve, 900));
        return {
          disabledWhileLoading,
          loadingVisible,
          loadingText,
          successVisible: success.getClientRects().length > 0,
          successText: success.textContent.trim(),
          cleared: document.getElementById("message").value === "",
          path: location.pathname,
        };
      })()
    `);

    expect(result.disabledWhileLoading).toBe(true);
    expect(result.loadingVisible).toBe(true);
    expect(result.loadingText).toBe("Preparing preview...");
    expect(result.successVisible).toBe(true);
    expect(result.successText).toContain("Form preview complete");
    expect(result.cleared).toBe(true);
    expect(result.path).toBe("/contact");
    expect(page.requests.filter((request) => request.method !== "GET")).toEqual([]);
    expect(page.requests.some((request) => request.url.endsWith("/contact") && request.method === "GET")).toBe(true);
    expect(page.problems).toEqual([]);
  });

  test("brands the header, links a favicon, and names the skip link once", async () => {
    await page.open("/");

    const branding = await page.evaluate<{
      favicon: string | null;
      brandName: string;
      brandVisible: boolean;
      skipLabel: string | null;
      skipText: string;
      footerName: string;
    }>(`
      (() => {
        const accessibleName = (element) => {
          const clone = element.cloneNode(true);
          clone.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
          return clone.textContent.replace(/\\s+/g, " ").trim();
        };
        const logo = document.querySelector(".brand-lockup");
        const footerBrand = document.querySelector(".brand-footer");
        const skip = document.querySelector(".skip-link");
        return {
          favicon: document.querySelector('link[rel="icon"]')?.getAttribute("href") ?? null,
          brandName: logo.getAttribute("aria-label") ?? accessibleName(logo),
          brandVisible: accessibleName(logo).length > 0 && logo.getClientRects().length > 0,
          skipLabel: skip.getAttribute("aria-label"),
          skipText: skip.textContent.trim(),
          footerName: footerBrand.getAttribute("aria-label") ?? accessibleName(footerBrand),
        };
      })()
    `);

    expect(branding.favicon).toBe("/static/favicon.svg");
    expect(branding.brandName).toBe("KCCF Ministries home");
    expect(branding.brandName.toLowerCase()).toContain("kccf ministries");
    expect(branding.brandVisible).toBe(true);
    expect(branding.skipLabel).toBeNull();
    expect(branding.skipText).toBe("Skip to main content");
    expect(branding.footerName).toBe("KCCF Ministries home");
  });

  test("loads a YouTube player only after pressing play, and swaps it from the archive", async () => {
    await page.open("/sermons");

    const beforeClick = page.requests.filter((request) => /youtube(-nocookie)?\.com/.test(request.url));
    expect(beforeClick).toEqual([]);

    const result = await page.evaluate<{
      initialSrc: string;
      afterPlay: string;
      afterSwap: string;
      facadeVisibleBefore: boolean;
      facadeVisibleAfterPlay: boolean;
      targetLabel: string | null;
    }>(`
      (async () => {
        const embed = document.querySelector("iframe.sermon-player-embed");
        const facade = document.querySelector(".sermon-facade");
        const initialSrc = embed?.getAttribute("src") ?? "";
        const facadeVisibleBefore = !facade || facade.getClientRects().length > 0;

        document.querySelector(".sermon-facade-play").click();
        await new Promise((resolve) => setTimeout(resolve, 400));
        const afterPlay = embed?.getAttribute("src") ?? "";
        const facadeVisibleAfterPlay = !facade || facade.getClientRects().length > 0;

        const loadedTitle = embed?.getAttribute("title") ?? "";
        const facadeLabel = document.querySelector(".sermon-facade-play").getAttribute("aria-label");
        const rows = [...document.querySelectorAll(".sermon-row-play")];
        const target = rows.find((row) => {
          const rowTitle = row.closest(".sermon-row").querySelector(".sermon-row-title").textContent.trim();
          return row.getAttribute("aria-label") !== facadeLabel && rowTitle !== loadedTitle;
        });
        const targetLabel = target?.getAttribute("aria-label") ?? null;

        if (target) {
          target.click();
          await new Promise((resolve) => setTimeout(resolve, 400));
        }

        return { initialSrc, afterPlay, afterSwap: embed?.getAttribute("src") ?? "", facadeVisibleBefore, facadeVisibleAfterPlay, targetLabel };
      })()
    `);

    expect(result.facadeVisibleBefore).toBe(true);
    expect(result.initialSrc).toBe("");
    expect(result.facadeVisibleAfterPlay).toBe(false);
    expect(result.afterPlay).toContain("https://www.youtube-nocookie.com/embed/");
    expect(result.afterPlay).toContain("autoplay=1");
    expect(result.afterPlay).not.toContain("www.youtube.com/embed");
    expect(result.targetLabel).not.toBeNull();
    expect(result.afterSwap).toContain("https://www.youtube-nocookie.com/embed/");
    expect(result.afterSwap).not.toBe(result.afterPlay);
    expect(page.problems).toEqual([]);
  });
});
