-- Mapeia o id gerado no cliente (diag_xxx) ao registro uuid do diagnóstico.
-- Usado na persistência de conversão (leads/solicitações) sem tornar o
-- servidor a fonte da verdade durante a edição.
alter table diagnostics add column if not exists client_ref text;
create unique index if not exists idx_diagnostics_client_ref on diagnostics (client_ref);
