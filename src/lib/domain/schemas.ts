import { z } from "zod";

/* =========================================================================
   Domínio — schemas Zod (fonte de verdade) e tipos derivados.
   Usados para validar entrada/saída de API, importação de JSON e o motor.
   ========================================================================= */

export const answerSchema = z.enum(["yes", "no", "unknown"]);
export type Answer = z.infer<typeof answerSchema>;

export const activityKindSchema = z.enum([
  "receive",
  "extract",
  "interpret",
  "validate",
  "calculate",
  "transfer",
  "route",
  "approve",
  "communicate",
  "record",
  "other",
]);
export type ActivityKind = z.infer<typeof activityKindSchema>;

export const accessMethodSchema = z.enum(["api_declared", "file", "manual", "unknown"]);
export type AccessMethod = z.infer<typeof accessMethodSchema>;

export const errorImpactSchema = z.enum(["low", "medium", "high", "unknown"]);
export type ErrorImpact = z.infer<typeof errorImpactSchema>;

/** Sinais de dor que o usuário pode marcar numa atividade. */
export const painSignalSchema = z.enum([
  "manual_work",
  "waiting",
  "rework",
  "inconsistency",
  "volume",
  "traceability",
]);
export type PainSignal = z.infer<typeof painSignalSchema>;

export const activitySchema = z.object({
  id: z.string().min(1),
  phaseId: z.string().min(1),
  order: z.number().int().nonnegative(),
  label: z.string().min(1).max(120),
  kind: activityKindSchema,
  responsibleRole: z.string().max(120).nullable(),
  systemIds: z.array(z.string()),

  structuredInput: answerSchema,
  objectiveRules: answerSchema,
  interpretationRequired: answerSchema,
  repetitive: answerSchema,
  mandatoryHumanApproval: answerSchema,

  accessMethod: accessMethodSchema,
  errorImpact: errorImpactSchema,
  painSignals: z.array(painSignalSchema),

  origin: z.enum(["template", "user"]),
  presenceConfirmed: z.boolean(),
  notes: z.string().max(2000).nullable(),
});
export type Activity = z.infer<typeof activitySchema>;

export const phaseSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  label: z.string().min(1).max(80),
});
export type Phase = z.infer<typeof phaseSchema>;

export const connectionTypeSchema = z.enum(["sequence", "decision", "return"]);
export type ConnectionType = z.infer<typeof connectionTypeSchema>;

export const connectionSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  type: connectionTypeSchema,
  /** Rótulo da condição — usado em decisões e retornos. */
  condition: z.string().max(120).nullable(),
});
export type Connection = z.infer<typeof connectionSchema>;

export const systemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
});
export type SystemRef = z.infer<typeof systemSchema>;

/* -------------------------------------------------------------------------
   Contexto empresarial (Apollo) com proveniência separada.
   ------------------------------------------------------------------------- */

export const fieldProvenanceSchema = z.enum(["apollo", "user", "confirmed"]);
export type FieldProvenance = z.infer<typeof fieldProvenanceSchema>;

/** Um valor de campo com origem e data — separa Apollo, correção e confirmação. */
export const provenancedFieldSchema = z.object({
  value: z.string().nullable(),
  source: fieldProvenanceSchema,
  at: z.string(), // ISO
});
export type ProvenancedField = z.infer<typeof provenancedFieldSchema>;

export const companyLookupStatusSchema = z.enum([
  "idle",
  "validating",
  "loading",
  "found",
  "partial",
  "not_found",
  "provider_unavailable",
  "rate_limited",
  "budget_exceeded",
  "manual",
]);
export type CompanyLookupStatus = z.infer<typeof companyLookupStatusSchema>;

/** Snapshot de dados retornados pelo provedor — nunca contém dados operacionais. */
export const companySnapshotSchema = z.object({
  name: z.string().nullable(),
  domain: z.string().nullable(),
  industry: z.string().nullable(),
  employeeRange: z.string().nullable(),
  location: z.string().nullable(),
  /** Marca clara de que o dado veio de um adaptador simulado. */
  simulated: z.boolean().default(false),
});
export type CompanySnapshot = z.infer<typeof companySnapshotSchema>;

export const companyContextSchema = z.object({
  status: companyLookupStatusSchema,
  domain: z.string().nullable(),
  /** Dados crus recebidos do Apollo (ou simulado). */
  apolloSnapshot: companySnapshotSchema.nullable(),
  /** Campo a campo, o que está confirmado para o diagnóstico. */
  confirmed: z.object({
    name: provenancedFieldSchema,
    domain: provenancedFieldSchema,
    industry: provenancedFieldSchema,
    employeeRange: provenancedFieldSchema,
    location: provenancedFieldSchema,
    /** Unidade/operação quando o resultado corresponde ao grupo. */
    operationUnit: provenancedFieldSchema,
  }),
  /** true depois que o usuário confirmou explicitamente o contexto. */
  contextConfirmed: z.boolean(),
});
export type CompanyContext = z.infer<typeof companyContextSchema>;

/* -------------------------------------------------------------------------
   Contexto do processo (T2)
   ------------------------------------------------------------------------- */

export const processProblemSchema = z.enum([
  "manual_work",
  "waiting",
  "rework",
  "inconsistency",
  "volume",
  "traceability",
  "still_exploring",
]);
export type ProcessProblem = z.infer<typeof processProblemSchema>;

export const processContextSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1).max(120),
  trigger: z.string().min(1).max(240),
  completion: z.string().min(1).max(240),
  mainProblem: processProblemSchema,
  area: z.string().max(120).nullable(),
  extraContext: z.string().max(2000).nullable(),
});
export type ProcessContext = z.infer<typeof processContextSchema>;

/* -------------------------------------------------------------------------
   Simulação (T5 / seção 14)
   ------------------------------------------------------------------------- */

export const simulationInputSchema = z.object({
  casesPerMonth: z.number().nonnegative().nullable(),
  currentMinutesPerCase: z.number().nonnegative().nullable(),
  proposedMinutesPerCase: z.number().nonnegative().nullable(),
  hourlyCost: z.number().nonnegative().nullable(),
});
export type SimulationInput = z.infer<typeof simulationInputSchema>;

/* -------------------------------------------------------------------------
   Diagnóstico — agregado principal
   ------------------------------------------------------------------------- */

export const diagnosticStatusSchema = z.enum(["preliminary", "confirmed"]);
export type DiagnosticStatus = z.infer<typeof diagnosticStatusSchema>;

export const processGraphSchema = z.object({
  phases: z.array(phaseSchema),
  activities: z.array(activitySchema),
  connections: z.array(connectionSchema),
  systems: z.array(systemSchema),
});
export type ProcessGraph = z.infer<typeof processGraphSchema>;

/** Seleção do recorte de implementação (T5 aba 3). */
export const scopeSelectionSchema = z.object({
  objective: z.string().max(400),
  activityIds: z.array(z.string()),
  outOfScope: z.array(z.string()),
});
export type ScopeSelection = z.infer<typeof scopeSelectionSchema>;

export const RULES_VERSION = "1.0.0";
export const TEMPLATES_VERSION = "1.0.0";
export const COPY_VERSION = "1.0.0";

export const diagnosticSchema = z.object({
  id: z.string().min(1),
  status: diagnosticStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().nonnegative(),
  rulesVersion: z.string(),
  templatesVersion: z.string(),

  company: companyContextSchema,
  process: processContextSchema.nullable(),
  current: processGraphSchema,
  /** Confirmação de que a estrutura atual foi validada pelo usuário. */
  currentConfirmed: z.boolean(),

  scope: scopeSelectionSchema.nullable(),
  simulation: simulationInputSchema.nullable(),
});
export type Diagnostic = z.infer<typeof diagnosticSchema>;

/** Payload aceito na importação de JSON (cria uma cópia). */
export const importPayloadSchema = z.object({
  diagnostic: diagnosticSchema,
});
export type ImportPayload = z.infer<typeof importPayloadSchema>;
