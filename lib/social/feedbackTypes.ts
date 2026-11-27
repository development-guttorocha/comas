export type FeedbackCategory = "suggestion" | "help" | "bug" | "praise";

export const FEEDBACK_CATEGORIES: Array<{ id: FeedbackCategory; label: string; emoji: string }> = [
  { id: "suggestion", label: "Sugestão / O que falta", emoji: "💡" },
  { id: "help", label: "Pedir ajuda", emoji: "🆘" },
  { id: "bug", label: "Algo não funcionou", emoji: "🛠️" },
  { id: "praise", label: "Elogio / Experiência", emoji: "❤️" },
];

export type CreatorFeedbackItem = {
  id: string;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  page: string;
  senderEmail: string;
  createdAt: string;
  emailed: boolean;
};
