import { test, expect } from "@playwright/test";

/* Jornada crítica (caminho manual, sem depender do provedor Apollo):
   capa → empresa (manual) → processo → atividades → resultado. */

test("da capa ao resultado pelo caminho manual", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("oportunidades de automação");

  // T0 → continua sem informar o site
  await page.getByRole("button", { name: "Continuar sem informar o site" }).click();

  // T1 → segue sem dados da empresa
  await expect(page.getByRole("heading", { name: "Confirme a empresa" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar sem esses dados" }).click();

  // T2 → escolhe modelo e preenche contexto
  await expect(page.getByRole("heading", { name: /Que tipo de processo/ })).toBeVisible();
  await page.getByRole("button", { name: /Consolidar dados e aplicar regras/ }).click();
  await page.getByLabel("Nome do processo *").fill("Fechamento contábil");
  await page.getByLabel("O que inicia o processo? *").fill("Recebimento dos lançamentos");
  await page.getByLabel("Quando ele está concluído? *").fill("Relatório publicado");
  await page.getByRole("button", { name: "Trabalho manual" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // T3/T4 → confirma a estrutura do processo
  await expect(page.getByRole("heading", { name: "Seu processo atual" })).toBeVisible();
  await page.getByRole("button", { name: /Confirmar estrutura e ver resultado/ }).click();

  // T5 → resultado
  await expect(page.getByText("Processo confirmado")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Oportunidades" })).toBeVisible();
  await page.getByRole("tab", { name: "Simulação" }).click();
  await expect(page.getByText(/Simulação de esforço/)).toBeVisible();
});
