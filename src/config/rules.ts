import { RULES_VERSION } from "@/lib/domain/schemas";

/* =========================================================================
   Metadados das regras (seção 11). A LÓGICA de avaliação vive no motor
   (lib/engine/rules.ts); aqui ficam id, condição legível e resultado —
   usados na documentação e nos rótulos da interface.
   ========================================================================= */

export const PROCESS_RULES_VERSION = RULES_VERSION;

export interface RuleMeta {
  id: string;
  condition: string;
  result: string;
}

export const RULES: RuleMeta[] = [
  { id: "R01", condition: "Aprovação obrigatória ou atividade de aprovação", result: "Preservar controle humano" },
  { id: "R02", condition: "Validar/calcular + critérios objetivos + sem interpretação", result: "Sugerir regras ou cálculo" },
  { id: "R03", condition: "Transferir/registrar + repetição", result: "Sugerir automação de registro ou integração" },
  { id: "R04", condition: "Oportunidade depende de integração e acesso desconhecido", result: "Registrar dependência" },
  { id: "R05", condition: "Extrair/interpretar + interpretação necessária", result: "Sugerir assistência por IA" },
  { id: "R06", condition: "Encaminhar + critérios objetivos", result: "Sugerir roteamento por regras" },
  { id: "R07", condition: "Encaminhar + interpretação necessária", result: "Sugerir classificação assistida" },
  { id: "R08", condition: "Inconsistência + critérios não definidos", result: "Sugerir definição dos critérios" },
  { id: "R09", condition: "Impacto de erro alto ou desconhecido", result: "Incluir revisão humana na proposta" },
  { id: "R10", condition: "Informações essenciais desconhecidas", result: "Marcar avaliação incompleta" },
  { id: "R11", condition: "Atividade “outro” sem classificação suficiente", result: "Não recomendar tecnologia" },
  { id: "R12", condition: "Processo não confirmado", result: "Identificar resultado como preliminar" },
];
