import type {
  AccessMethod,
  ActivityKind,
  ErrorImpact,
  PainSignal,
  ProcessProblem,
} from "./schemas";

/* Rótulos em português para enums do domínio — reutilizados na UI e exportações. */

export const PROBLEM_LABELS: Record<ProcessProblem, string> = {
  manual_work: "Trabalho manual",
  waiting: "Espera entre atividades",
  rework: "Retrabalho",
  inconsistency: "Inconsistência",
  volume: "Dificuldade com volume",
  traceability: "Falta de rastreabilidade",
  still_exploring: "Ainda quero entender o problema",
};

export const PAIN_SIGNAL_LABELS: Record<PainSignal, string> = {
  manual_work: "Trabalho manual",
  waiting: "Espera",
  rework: "Retrabalho",
  inconsistency: "Inconsistência",
  volume: "Volume",
  traceability: "Rastreabilidade",
};

export const KIND_LABELS: Record<ActivityKind, string> = {
  receive: "Receber",
  extract: "Extrair",
  interpret: "Interpretar",
  validate: "Validar",
  calculate: "Calcular",
  transfer: "Transferir",
  route: "Encaminhar",
  approve: "Aprovar",
  communicate: "Comunicar",
  record: "Registrar",
  other: "Outro",
};

export const ACCESS_METHOD_LABELS: Record<AccessMethod, string> = {
  api_declared: "API (declarada pelo usuário)",
  file: "Arquivo",
  manual: "Manual",
  unknown: "Não sei",
};

export const ERROR_IMPACT_LABELS: Record<ErrorImpact, string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  unknown: "Não sei",
};
