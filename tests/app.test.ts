import { describe, expect, test } from "bun:test";
import { app, createApp } from "../src/index";

describe("public application", () => {
  test("serves a health check", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
  });

  test("creates an independent application with a health check", async () => {
    const testApp = createApp();
    const response = await testApp.request("/health");

    expect(response.status).toBe(200);
  });

  test("serves static assets", async () => {
    const testApp = createApp();
    const response = await testApp.request("/static/datastar.js");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("javascript");
  });

  test("returns not found for an unknown route", async () => {
    const response = await app.request("/does-not-exist");

    expect(response.status).toBe(404);
  });
});
