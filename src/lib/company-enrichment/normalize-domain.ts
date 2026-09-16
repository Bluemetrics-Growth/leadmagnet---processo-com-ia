/* =========================================================================
   Normalização do site informado (seção 8.4).
   Não busca a URL; apenas extrai um domínio canônico para a consulta Apollo.
   ========================================================================= */

export type DomainNormalization =
  | { ok: true; domain: string }
  | { ok: false; reason: DomainError };

export type DomainError =
  | "empty"
  | "invalid_url"
  | "invalid_scheme"
  | "has_credentials"
  | "is_ip"
  | "is_localhost"
  | "invalid_hostname";

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9](-?[a-z0-9])*)(\.[a-z0-9](-?[a-z0-9])*)+$/;

/**
 * Aceita `empresa.com.br`, `www.empresa.com.br`, `https://empresa.com.br/sobre`.
 * Passos: trim, parse de URL, apenas http/https, hostname minúsculo, remove
 * `www.`, descarta caminho/query/porta, rejeita credenciais/IP/localhost.
 * Preserva subdomínios; não trunca por divisão simples de pontos.
 */
export function normalizeDomain(raw: string): DomainNormalization {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  // Garante um esquema para o parser; entrada sem esquema recebe https://.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "invalid_scheme" };
  }

  // Credenciais embutidas (user:pass@host) são rejeitadas.
  if (url.username || url.password) {
    return { ok: false, reason: "has_credentials" };
  }

  let host = url.hostname.toLowerCase();

  // Remove ponto final absoluto, se houver.
  if (host.endsWith(".")) host = host.slice(0, -1);

  if (host === "localhost" || host.endsWith(".localhost")) {
    return { ok: false, reason: "is_localhost" };
  }

  // IPv6 chega entre colchetes; IPv4 casa o regex. Ambos rejeitados.
  if (host.startsWith("[") || IPV4.test(host)) {
    return { ok: false, reason: "is_ip" };
  }

  // Remove somente o prefixo www. (uma vez), preservando demais subdomínios.
  if (host.startsWith("www.")) host = host.slice(4);

  if (!HOSTNAME.test(host)) {
    return { ok: false, reason: "invalid_hostname" };
  }

  return { ok: true, domain: host };
}

export const DOMAIN_ERROR_MESSAGE: Record<DomainError, string> = {
  empty: "Informe o site da sua empresa.",
  invalid_url: "Não reconhecemos esse endereço. Exemplo: empresa.com.br",
  invalid_scheme: "Use um endereço http ou https.",
  has_credentials: "Remova usuário e senha do endereço.",
  is_ip: "Informe um domínio, não um endereço IP.",
  is_localhost: "Informe o domínio público da empresa.",
  invalid_hostname: "Esse domínio parece inválido. Exemplo: empresa.com.br",
};
