# PRD — Mapa de Automação Bluemetrics (referência)

Versão 1.1 (consolidada). Este documento resume o PRD entregue, que é a fonte de
verdade do escopo. Os detalhes de implementação estão em `ARCHITECTURE.md`,
`RULES.md`, `OPERATIONS.md` e `DESIGN_SYSTEM_MAP.md`.

## Visão

Aplicação gratuita que permite a um gestor: informar o site, confirmar o contexto
empresarial (Apollo), escolher um modelo de processo, editar fases e atividades,
identificar oportunidades por regras explícitas, comparar atual/proposto, delimitar
um primeiro recorte e exportar o diagnóstico / solicitar avaliação da Bluemetrics.

MVP **determinístico, sem LLM**.

## Decisões obrigatórias (seção 3)

- Identidade visual: seguir fielmente o design system da BM no repositório.
- Primeira interação: campo de site na capa.
- Sem cadastro para ver o resultado.
- Apollo: apenas enriquecimento de organização (sem pessoas, sequências, mensagens
  ou leitura do site).
- Personalização operacional baseada em respostas estruturadas do usuário.
- Resultado: diagnóstico preliminar explicável, sem promessa de viabilidade.

## Jornada (seção 7)

T0 capa → T1 confirmação da empresa → T2 processo e contexto → T3 processo atual →
T4 características das atividades → T5 resultado (Mapa, Oportunidades, Primeiro
recorte, Simulação) → T6 captura e exportação → T7 solicitar avaliação.

## Escopo (seção 6)

Incluído: capa com site, consulta Apollo, confirmação/edição de contexto, modelos +
personalizado, editor de fases/atividades, decisões e retornos simples, recomendações
determinísticas, comparação atual/proposto, recorte, simulação opcional, captura de
contato, exportações, solicitação de avaliação e eventos de produto. (A gestão de
leads não é feita no app: os leads ficam no Supabase e serão integrados ao HubSpot.)

Excluído: pessoas no Apollo, contatos/sequências/mensagens, crawling do site, upload de
documentos, chat aberto, editor BPMN completo, integrações operacionais, execução de
automações, orçamento automático, colaboração simultânea.

## Motor (seções 10–14)

Contrato de atividade tipado, regras R01–R12 com explicação obrigatória, priorização
e recorte, comparação atual/proposto e simulação de esforço informada pelo usuário.
Ver `RULES.md`.

## Apollo (seção 8)

Normalização de domínio, consulta ao endpoint fixo de enriquecimento, proveniência
separada (Apollo / usuário / confirmado), estados de resultado, cache e controle de
custo. Ver `OPERATIONS.md`.

## Arquitetura, dados e endpoints (seções 15–19)

Next.js + TypeScript + Zod; motor puro; persistência no navegador no MVP e Supabase
como alvo de produção; adaptador Apollo simulado em desenvolvimento. Ver
`ARCHITECTURE.md`.

## Critérios de aceite (seção 22)

Resumo verificado neste MVP:
- Design system inventariado em `DESIGN_SYSTEM_MAP.md`; cores/fontes/logos/componentes
  seguem a marca; sem tokens provisórios; navegação principal no celular e por teclado.
- Apollo: aceita `empresa.com.br` e URL completa; consulta só após ação; cache;
  limites antes do provedor; falha nunca bloqueia; campos desconhecidos não inventados;
  correção/rejeição isoladas por usuário; nenhuma busca de pessoa; nenhuma URL acessada;
  nenhum segredo no cliente.
- Motor: resultado reproduzível; aprovação humana preservada; cálculo objetivo não
  substituído por IA; acesso desconhecido vira dependência; recomendações com justificativa;
  Apollo não preenche atributos operacionais; atual separado da proposta; recorte ajustável;
  simulação respeita as premissas.
- Dados/conversão: sessões isoladas; e-mail não concede acesso; duplo envio não duplica
  pedido; resultado antes do cadastro; exportação corresponde à versão exibida; pedido de
  avaliação explícito; sem sincronização comercial com Apollo.
