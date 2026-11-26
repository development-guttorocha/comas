"use client";

import { track } from "@vercel/analytics";

export default function PrintButton({ className }: { className?: string }) {
  return <button type="button" className={className} onClick={() => { track("material_print", { material: "trilha-de-carreira" }); window.print(); }}>Imprimir ou salvar PDF</button>;
}
