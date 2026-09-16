import { TEMPLATES_VERSION } from "@/lib/domain/schemas";
import type { ActivityKind } from "@/lib/domain/schemas";

/* =========================================================================
   Modelos de processo versionados (seção 9).
   Estruturas genéricas inspiradas nas capacidades da BM — sem dados de
   clientes. Atividades entram como SUGESTÕES (origin: "template").
   ========================================================================= */

export const PROCESS_TEMPLATES_VERSION = TEMPLATES_VERSION;

export interface TemplateActivityDef {
  label: string;
  kind: ActivityKind;
}

export interface TemplatePhaseDef {
  label: string;
  activities: TemplateActivityDef[];
}

export interface ProcessTemplate {
  id: string;
  /** Rótulo curto para o cartão de seleção (T2). */
  title: string;
  /** Descrição do cartão. */
  description: string;
  /** Rótulo da pergunta “que tipo de processo?” */
  question: string;
  phases: TemplatePhaseDef[];
}

export const PROCESS_TEMPLATES: ProcessTemplate[] = [
  {
    id: "document_analysis",
    title: "Analisar documentos e conferir informações",
    description:
      "Recebimento de documentos, verificação de completude e registro de decisões com base em critérios.",
    question: "Analisar documentos e conferir informações",
    phases: [
      {
        label: "Entrada",
        activities: [
          { label: "Receber documento", kind: "receive" },
          { label: "Verificar completude", kind: "validate" },
        ],
      },
      {
        label: "Análise",
        activities: [
          { label: "Identificar informações", kind: "extract" },
          { label: "Consultar critérios", kind: "validate" },
          { label: "Registrar achados", kind: "record" },
        ],
      },
      {
        label: "Decisão",
        activities: [
          { label: "Revisar", kind: "approve" },
          { label: "Registrar decisão", kind: "record" },
        ],
      },
    ],
  },
  {
    id: "requests",
    title: "Receber, qualificar e encaminhar solicitações",
    description:
      "Entrada de solicitações, verificação de critérios e encaminhamento para atendimento.",
    question: "Receber, qualificar e encaminhar solicitações",
    phases: [
      {
        label: "Recepção",
        activities: [
          { label: "Receber solicitação", kind: "receive" },
          { label: "Coletar informações", kind: "extract" },
        ],
      },
      {
        label: "Triagem",
        activities: [
          { label: "Verificar critérios", kind: "validate" },
          { label: "Encaminhar", kind: "route" },
        ],
      },
      {
        label: "Conclusão",
        activities: [
          { label: "Atender", kind: "transfer" },
          { label: "Registrar resultado", kind: "record" },
        ],
      },
    ],
  },
  {
    id: "data_rules",
    title: "Consolidar dados e aplicar regras ou cálculos",
    description:
      "Obtenção e conciliação de dados, validação e aplicação de regras ou cálculos com registro da saída.",
    question: "Consolidar dados e aplicar regras ou cálculos",
    phases: [
      {
        label: "Coleta",
        activities: [
          { label: "Obter dados", kind: "receive" },
          { label: "Conciliar", kind: "validate" },
        ],
      },
      {
        label: "Processamento",
        activities: [
          { label: "Validar completude", kind: "validate" },
          { label: "Aplicar cálculo ou regra", kind: "calculate" },
        ],
      },
      {
        label: "Saída",
        activities: [
          { label: "Revisar", kind: "approve" },
          { label: "Registrar saída", kind: "record" },
        ],
      },
    ],
  },
  {
    id: "custom",
    title: "Montar meu próprio processo",
    description:
      "Comece de uma estrutura mínima de entrada, tratamento e conclusão e adicione as atividades do seu processo.",
    question: "Montar meu próprio processo",
    phases: [
      {
        label: "Início",
        activities: [{ label: "Entrada", kind: "receive" }],
      },
      {
        label: "Tratamento",
        activities: [{ label: "Tratamento", kind: "other" }],
      },
      {
        label: "Conclusão",
        activities: [{ label: "Conclusão", kind: "record" }],
      },
    ],
  },
];

export function getTemplate(id: string): ProcessTemplate | undefined {
  return PROCESS_TEMPLATES.find((t) => t.id === id);
}
