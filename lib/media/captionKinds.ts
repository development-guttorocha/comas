// Client-safe part of the image captions (the rest of lib/media/captions.ts uses Node).
export const CAPTION_KINDS = {
  "tela-app": "Tela de app",
  "tela-web": "Tela web",
  "varias-telas": "Várias telas",
  "antes-depois": "Antes/depois",
  foto: "Foto",
  diagrama: "Diagrama",
  logo: "Logo",
  ilustracao: "Ilustração",
} as const;
export type CaptionKind = keyof typeof CAPTION_KINDS;
