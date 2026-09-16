import { describe, it, expect } from "vitest";
import { normalizeDomain } from "@/lib/company-enrichment/normalize-domain";

describe("normalizeDomain", () => {
  it("aceita domínio simples", () => {
    expect(normalizeDomain("empresa.com.br")).toEqual({ ok: true, domain: "empresa.com.br" });
  });

  it("remove www e caminho/query/porta", () => {
    expect(normalizeDomain("https://www.empresa.com.br/sobre?x=1")).toEqual({
      ok: true,
      domain: "empresa.com.br",
    });
    expect(normalizeDomain("http://empresa.com.br:8080/a")).toEqual({ ok: true, domain: "empresa.com.br" });
  });

  it("preserva subdomínios relevantes (não trunca por pontos)", () => {
    expect(normalizeDomain("app.empresa.com.br")).toEqual({ ok: true, domain: "app.empresa.com.br" });
  });

  it("normaliza maiúsculas e espaços", () => {
    expect(normalizeDomain("  Empresa.COM.br  ")).toEqual({ ok: true, domain: "empresa.com.br" });
  });

  it("rejeita vazio", () => {
    expect(normalizeDomain("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejeita IP e localhost", () => {
    expect(normalizeDomain("http://127.0.0.1")).toEqual({ ok: false, reason: "is_ip" });
    expect(normalizeDomain("localhost:3000")).toEqual({ ok: false, reason: "is_localhost" });
  });

  it("rejeita credenciais embutidas", () => {
    expect(normalizeDomain("https://user:pass@empresa.com.br")).toEqual({
      ok: false,
      reason: "has_credentials",
    });
  });

  it("rejeita esquema não http(s)", () => {
    expect(normalizeDomain("ftp://empresa.com.br")).toEqual({ ok: false, reason: "invalid_scheme" });
  });

  it("rejeita hostname sem ponto (inválido para domínio público)", () => {
    expect(normalizeDomain("empresa")).toEqual({ ok: false, reason: "invalid_hostname" });
  });
});
