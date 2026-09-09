import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/stock" }));
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));
vi.mock("./trial-timer", () => ({ TrialTimer: () => null }));
import { AdminShell } from "./admin-shell";
afterEach(() => vi.unstubAllGlobals());

describe("owner navigation", () => {
  it("opens private preview instead of a public 404 before publication", () => {
    vi.stubGlobal("React", React);
    const html = renderToStaticMarkup(<AdminShell role="owner" tenant={{name:"Серик Шоп",slug:"serik",plan:"standard",status:"active",trialEndsAt:null,catalogPublished:false}}>Content</AdminShell>);
    expect(html).toContain('href="/store-preview"');
    expect(html).toContain('Предпросмотр магазина');
    expect(html).not.toContain('href="/s/serik"');
  });
  it("preserves secondary routes while keeping four mobile controls", () => {
    vi.stubGlobal("React", React);
    const html = renderToStaticMarkup(<AdminShell role="owner" tenant={{name:"Серик Шоп",slug:"serik",plan:"standard",status:"active",trialEndsAt:null}}>Content</AdminShell>);
    for (const route of ["stock", "analytics", "customers", "requests", "integrations", "domains", "plan", "settings"]) expect(html).toContain(`href="/admin/${route}"`);
    const mobile = html.match(/<nav aria-label="Основная навигация"[\s\S]*?<\/nav>/)?.[0] ?? "";
    expect((mobile.match(/<a /g) ?? []).length).toBe(3);
    expect((mobile.match(/<button /g) ?? []).length).toBe(1);
    for (const label of ["AI Studio", "Каталог", "Заказы", "Ещё"]) expect(mobile).toContain(label);
    expect(html).not.toContain("Обзор");
    expect(mobile).toContain('aria-controls="admin-mobile-sheet"');
    expect(html).not.toContain('href="/root"');
  });
});
