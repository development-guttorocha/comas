import HomeHeroClient from "@/components/HomeHeroClient";
import type { HomeContent } from "@/lib/pages/schemas";

export default function HomeHero({ content }: { content: HomeContent }) { return <HomeHeroClient content={content} />; }
