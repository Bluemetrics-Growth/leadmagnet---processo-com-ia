import { describe, it, expect } from "vitest";
import { salvageDiagnosticFields, readClientRef } from "@/lib/server/persistence";

describe("persistência de conversão — salvamento resiliente", () => {
  it("readClientRef lê o id de um diagnóstico cru", () => {
    expect(readClientRef({ id: "diag_abc", process: {} })).toBe("diag_abc");
  });

  it("readClientRef devolve null para payload sem id válido", () => {
    expect(readClientRef({ id: "" })).toBeNull();
    expect(readClientRef({})).toBeNull();
    expect(readClientRef(null)).toBeNull();
    expect(readClientRef("diag_abc")).toBeNull();
  });

  it("salvageDiagnosticFields extrai só campos seguros de um diagnóstico inválido", () => {
    // process.trigger vazio inviabiliza o diagnosticSchema, mas ainda salvamos o lead.
    const raw = {
      id: "diag_1",
      status: "confirmed",
      version: 3,
      rulesVersion: "1.0.0",
      templatesVersion: "1.0.0",
      process: { name: "Contas a pagar", trigger: "", completion: "" },
      current: { phases: [], activities: [], connections: [], systems: [] },
    };
    expect(salvageDiagnosticFields(raw)).toEqual({
      status: "confirmed",
      version: 3,
      rulesVersion: "1.0.0",
      templatesVersion: "1.0.0",
      processName: "Contas a pagar",
    });
  });

  it("salvageDiagnosticFields ignora valores fora do formato", () => {
    expect(salvageDiagnosticFields({ status: "qualquer", version: -1, process: 42 })).toEqual({});
    expect(salvageDiagnosticFields(null)).toEqual({});
    expect(salvageDiagnosticFields("x")).toEqual({});
  });
});
