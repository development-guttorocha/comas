import test from "node:test";
import assert from "node:assert/strict";
import { parseImportedAnswers } from "./salarySurveyImport";

test("parseImportedAnswers handles JSON array and normalizes values", () => {
  const result = parseImportedAnswers(JSON.stringify([
    {
      edition: "2027",
      role: "Pleno",
      specialty: "Product design",
      experience: "2 a 4",
      regime: "CLT",
      salary: 8500,
      bonus: "Até 1 salário",
      companySize: "501 a 5.000",
      sector: "Banco ou fintech",
      state: "SP",
      workModel: "Híbrido",
      gender: "",
      createdAt: "2026-11-20",
    },
  ]));

  assert.equal(result.invalid.length, 0);
  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0]!.salary, 8500);
  assert.equal(result.valid[0]!.createdAt, "2026-11-20");
});

test("parseImportedAnswers extracts embedded JSON blocks from Resend fallback e-mails", () => {
  const emailDump = `
Pesquisa salarial 2027: resposta (fallback — não gravada no Supabase)
Seu papel hoje: Sênior
Salário bruto mensal (R$): R$ 14.000
JSON: {"edition":"2027","role":"Sênior","specialty":"Design system","experience":"5 a 7","regime":"PJ","salary":18000,"bonus":"Não recebi","companySize":"51 a 500","sector":"Tecnologia / SaaS","state":"RJ","workModel":"Remoto","gender":"Mulher","createdAt":"2026-11-21"}

---
Outro envio:
JSON: {"edition":"2027","role":"Júnior","specialty":"UX/UI","experience":"Menos de 2","regime":"CLT","salary":4800,"bonus":"Não recebi","companySize":"Até 50 pessoas","sector":"Agência ou consultoria","state":"MG","workModel":"Presencial","gender":"","createdAt":"2026-11-22"}
  `;

  const result = parseImportedAnswers(emailDump);
  assert.equal(result.invalid.length, 0);
  assert.equal(result.valid.length, 2);
  assert.equal(result.valid[0]!.role, "Sênior");
  assert.equal(result.valid[0]!.salary, 18000);
  assert.equal(result.valid[1]!.role, "Júnior");
});

test("parseImportedAnswers parses CSV with Portuguese headers and reports invalid rows cleanly", () => {
  const csv = [
    "Papel;Área;Experiência;Regime;Salário;Bônus;Porte;Setor;Estado;Modelo;Gênero;Data",
    "Pleno;Product design;2 a 4 anos;CLT;R$ 9.200;Até 1 salário;501 a 5.000;Tecnologia / SaaS;SP;Remoto;Homem;22/11/2026",
    "Invalido;Product design;2 a 4;CLT;100;Não recebi;501 a 5.000;Tecnologia / SaaS;SP;Remoto;;22/11/2026",
  ].join("\n");

  const result = parseImportedAnswers(csv);
  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0]!.experience, "2 a 4");
  assert.equal(result.valid[0]!.salary, 9200);
  assert.equal(result.valid[0]!.createdAt, "2026-11-22");
  assert.equal(result.invalid.length, 1);
  assert.equal(result.invalid[0]!.index, 2);
});

test("parseImportedAnswers parses plain Resend label/value blocks without JSON", () => {
  const plain = `
Seu papel hoje: Design Lead
Área principal: Gestão
Anos de experiência em design: 8 a 11
Regime de contratação: CLT
Salário bruto mensal (R$): R$ 19.500
Bônus ou PLR no último ano: 1 a 3 salários
Tamanho da empresa: Mais de 5.000
Setor: Banco ou fintech
Onde você mora: SP
Modelo de trabalho: Híbrido
Gênero: —
  `;

  const result = parseImportedAnswers(plain);
  assert.equal(result.invalid.length, 0);
  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0]!.role, "Design Lead");
  assert.equal(result.valid[0]!.salary, 19500);
  assert.equal(result.valid[0]!.gender, "");
});
