import test from "node:test";
import assert from "node:assert/strict";
import { parseResendLeadText } from "./leadImport";
import { leadKindOf, parseLead, toSiteLeadInsert, type Lead } from "./leads";

test("leadKindOf classifies service, material, and open contact leads accurately", () => {
  assert.equal(leadKindOf({ service: "Design System no Figma", audience: "", page: "/servicos/design-system-figma" }), "service");
  assert.equal(leadKindOf({ service: "Material: Trilha de carreira em design", audience: "designer", page: "/recursos/trilha-de-carreira" }), "material");
  assert.equal(leadKindOf({ service: "Contato pelo site", audience: "geral", page: "/fale-comigo" }), "contact");
});

test("toSiteLeadInsert maps camelCase fields to Supabase snake_case schema", () => {
  const lead: Lead = {
    name: "Ana Paula",
    email: "ana@empresa.com",
    company: "Empresa X",
    teamSize: "4 a 10 designers",
    message: "Precisamos organizar o design system.",
    service: "Design System no Figma",
    format: "Auditoria e plano",
    page: "/servicos/design-system-figma",
    audience: "",
    optIn: false,
    createdAt: "2026-11-25T12:00:00.000Z",
  };

  assert.deepEqual(toSiteLeadInsert(lead, { status: "new", source: "web" }), {
    kind: "service",
    name: "Ana Paula",
    email: "ana@empresa.com",
    company: "Empresa X",
    team_size: "4 a 10 designers",
    message: "Precisamos organizar o design system.",
    service: "Design System no Figma",
    format: "Auditoria e plano",
    page: "/servicos/design-system-figma",
    audience: "",
    opt_in: false,
    status: "new",
    source: "web",
    external_id: null,
    created_at: "2026-11-25T12:00:00.000Z",
  });
});

test("parseLead validates material, company service, and open contact forms", () => {
  const matForm = new FormData();
  matForm.set("name", "Lucas");
  matForm.set("email", "LUCAS@example.com");
  matForm.set("service", "Material: Trilha de carreira em design");
  matForm.set("page", "/recursos/trilha-de-carreira");
  matForm.set("audience", "designer");
  matForm.set("optIn", "on");

  const parsedMat = parseLead(matForm);
  assert.deepEqual(parsedMat.errors, {});
  assert.equal(parsedMat.lead.optIn, true);
  assert.equal(parsedMat.lead.email, "lucas@example.com");

  const contactForm = new FormData();
  contactForm.set("name", "Marina");
  contactForm.set("email", "marina@example.com");
  contactForm.set("audience", "geral");
  contactForm.set("service", "Contato pelo site");
  contactForm.set("page", "/fale-comigo");
  contactForm.set("message", "Quero conversar sobre consultoria para meu time.");

  const parsedContact = parseLead(contactForm);
  assert.deepEqual(parsedContact.errors, {});
  assert.equal(leadKindOf(parsedContact.lead), "contact");
});

test("parseResendLeadText reconstructs material and multiline service leads", () => {
  const materialText = [
    "Nome: Camila",
    "E-mail: CAMILA@site.com",
    "Empresa: —",
    "Momento: —",
    "Serviço: Material: Trilha de carreira em design",
    "Interesse: Ainda não sei",
    "Mensagem: —",
    "Página: /recursos/trilha-de-carreira",
    "Novos materiais: Sim, aceitou receber",
  ].join("\n");

  const matLead = parseResendLeadText(materialText, "Novo lead · Material: Trilha de carreira em design · Camila", "2026-11-25T17:00:00Z")!;
  assert.equal(matLead.name, "Camila");
  assert.equal(matLead.email, "camila@site.com");
  assert.equal(matLead.company, "");
  assert.equal(matLead.format, "");
  assert.equal(matLead.optIn, true);
  assert.equal(matLead.audience, "designer");
  assert.equal(leadKindOf(matLead), "material");

  const serviceText = [
    "Nome: Bruno",
    "E-mail: bruno@acme.com",
    "Empresa: Acme",
    "Time de design: 1 a 3 designers",
    "Serviço: Head de Design as a service",
    "Interesse: Acompanhamento mensal",
    "Mensagem: Linha 1",
    "Linha 2 da mensagem",
    "Página: /servicos/head-de-design",
  ].join("\n");

  const svcLead = parseResendLeadText(serviceText, "Novo lead · Head de Design as a service · Acme", "2026-11-12T15:21:48Z")!;
  assert.equal(svcLead.company, "Acme");
  assert.equal(svcLead.teamSize, "1 a 3 designers");
  assert.equal(svcLead.message, "Linha 1\nLinha 2 da mensagem");
  assert.equal(svcLead.optIn, false);
  assert.equal(leadKindOf(svcLead), "service");
});
