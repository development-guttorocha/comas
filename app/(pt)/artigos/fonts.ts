import { Source_Serif_4 } from "next/font/google";

/** The articles' reading face: a text serif made for long screen reading. Titles stay in DM Sans. */
export const readingSerif = Source_Serif_4({
  variable: "--font-reading",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});
