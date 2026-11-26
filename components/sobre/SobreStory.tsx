import { Fragment } from "react";
import { VeiledImage } from "@/components/ImageVeil";
import type { SiteLocale } from "@/lib/siteLocale";
import type { SobreContent } from "@/lib/pages/schemas";
import ScrollReveal from "@/components/ScrollReveal";
import { StoryCarSequence } from "./StoryCarSequence";
import assets from "./storyAssets.json";
import { StoryMotion, StoryCoverMotion, StoryMemoryCard } from "./StoryMotion";
import { StoryMemoryRail, StoryDeviceOrbit, StoryProjectGallery, StoryGif } from "./StoryScrollScenes";
import { StoryPandemicScreen, StoryVideo, StoryVisionJourney } from "./StoryMedia";
import { StoryBike } from "./StoryBike";
import { StoryLeadershipCases } from "./StoryLeadership";
import { Note, SplitHeading } from "@/components/guide";
import styles from "./SobreStory.module.css";

type AssetName = keyof typeof assets;

export function StoryAsset({ name, alt, className, sizes = "(max-width: 767px) 90vw, 600px", preload = false }: {
  name: AssetName; alt: string; className?: string; sizes?: string; preload?: boolean;
}) {
  return <VeiledImage {...assets[name]} alt={alt} className={className} sizes={sizes} preload={preload} />;
}

function EraCover({ year, caption, image, preload = false, glitch = false }: {
  year: string; caption: string; image: AssetName; preload?: boolean; glitch?: boolean;
}) {
  return (
    <StoryCoverMotion glitch={glitch} image={<StoryAsset name={image} alt="" className={styles.coverImage} sizes="100vw" preload={preload} />}>
        <h2 id={`era-${year}`}>{year}</h2>
        <p>{caption}</p>
    </StoryCoverMotion>
  );
}

function ChapterIntro({ title, continuation, body }: { title: string; continuation: string; body: string }) {
  return (
    <div className={`${styles.wrap} ${styles.chapterIntro}`}>
      <ScrollReveal tone="editorial"><SplitHeading as="h3" title={title} continuation={continuation} /></ScrollReveal>
      <ScrollReveal tone="editorial" delay={0.08}><Note><p>{body}</p></Note></ScrollReveal>
    </div>
  );
}

function Device({ kind, label }: { kind: "tv" | "monitor" | "notebook" | "remote"; label: string }) {
  const frame = kind === "remote" ? "flatMonitor" : kind;
  return (
    <figure className={`${styles.deviceStage} ${styles[kind]}`}>
      <StoryMotion className={styles.device} variant="object">
        {kind === "remote" ? <StoryAsset name="webcam" alt="" className={styles.webcam} /> : null}
        <StoryAsset name={frame} alt="" className={styles.deviceFrame} />
        <div className={styles.deviceScreen}>
          {kind === "tv" ? <StoryGif year={1990} /> : kind === "monitor" ? <StoryGif year={2000} /> : kind === "remote" ? <StoryPandemicScreen /> : <>
            <StoryAsset name="youtube" alt="" className={styles.youtubePage} />
            <StoryGif year={2010} className={styles.youtubePlayer} />
          </>}
        </div>
      </StoryMotion>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

type Era = SobreContent["eras"][number];
const noEra: Era = { year: "", caption: "", title: "", continuation: "", body: "", device: "", answer: "" };
/** The texts of one decade, found by its year. */
const eraOf = (content: SobreContent, year: string) => content.eras.find(era => era.year === year) ?? noEra;
/** Only images the code knows: an unknown name in the admin is left out. */
const known = <T extends { image: string }>(list: T[]) => list.filter((item): item is T & { image: AssetName } => item.image in assets);

export function StoryDialogue({ question, answer }: { question: string; answer: string }) {
  return <section className={styles.dialogue} aria-label={`${question} ${answer}`}>
    <StoryMotion className={styles.wrap}>
      <h3>{question}<br /><span>{answer}</span></h3>
    </StoryMotion>
  </section>;
}

export function SobreStory({ content }: { content: SobreContent }) {
  const [e1990, e2000, e2010] = ["1990", "2000", "2010"].map(year => eraOf(content, year));
  const alt = (image: string) => content.gallery.find(item => item.image === image)?.alt ?? "";
  const q = content.dialogueQuestion;
  return (
    <div id="historia" className={styles.story}>
      <section id="decade-1990" className={styles.era} aria-labelledby="era-1990">
        <EraCover year="1990" caption={e1990.caption} image="childhood" preload />
        <ChapterIntro title={e1990.title} continuation={e1990.continuation} body={e1990.body} />
        <Device kind="tv" label={e1990.device} />
        <section className={styles.magazines} aria-labelledby="magazines-title">
          <StoryVideo name="magazines" poster="magazinesPoster" className={styles.magazineVideo} label={content.magazinesLabel} />
          <div className={styles.magazineCopy}>
            <ScrollReveal tone="editorial">
              <h3 id="magazines-title">{content.magazinesTitle}</h3>
              <p>{content.magazinesBody}<br />
                <span className={styles.spoiler}>{content.magazinesSpoiler}</span>
              </p>
            </ScrollReveal>
          </div>
        </section>
        <section className={`${styles.wrap} ${styles.carChapter}`} aria-labelledby="car-title">
          <div className={styles.centered}>
            <h3 id="car-title">{content.carTitle}</h3>
            <p>{content.carBody}</p>
          </div>
          <StoryCarSequence caption={content.carCaption} hint={content.carHint} alt={content.carAlt} label={content.carLabel} />
        </section>
        <StoryDialogue question={q} answer={e1990.answer} />
      </section>

      <section id="decade-2000" className={styles.era} aria-labelledby="era-2000">
        <EraCover year="2000" caption={e2000.caption} image="internet" />
        <ChapterIntro title={e2000.title} continuation={e2000.continuation} body={e2000.body} />
        <Device kind="monitor" label={e2000.device} />
        <StoryMemoryRail title={<h3 id="memories-title">{content.memoriesTitle.split("\n").map((line, i) => <Fragment key={i}>{i ? <br /> : null}{line}</Fragment>)}</h3>} label={content.memoriesLabel}>
          {known(content.memories).map(memory => (
            <StoryMemoryCard key={memory.image}>
              <div className={styles.memoryImage}><StoryAsset name={memory.image} alt={memory.alt} sizes="(max-width: 767px) 75vw, 36vw" /></div>
              <h4>{memory.title}</h4>
            </StoryMemoryCard>
          ))}
        </StoryMemoryRail>
        <StoryDialogue question={q} answer={e2000.answer} />
        <StoryDeviceOrbit devices={content.orbit} label={content.orbitLabel} />
      </section>

      <section id="decade-2010" className={styles.era} aria-labelledby="era-2010">
        <EraCover year="2010" caption={e2010.caption} image="studio" />
        <ChapterIntro title={e2010.title} continuation={e2010.continuation} body={e2010.body} />
        <Device kind="notebook" label={e2010.device} />
        <div className={`${styles.wrap} ${styles.galleryHeading}`}><div className={styles.centered}><h3>{content.galleryTitle}</h3></div></div>
        <StoryProjectGallery label={content.galleryLabel} columns={[
          <div key="regatta"><StoryAsset name="regatta" className={styles.regattaProject} alt={alt("regatta")} sizes="(max-width: 767px) 42vw, 20vw" /><StoryAsset name="project11" className={styles.fipeProject} alt={alt("project11")} sizes="(max-width: 767px) 42vw, 20vw" /></div>,
          <div key="chevrolet"><StoryAsset name="chevrolet" className={styles.chevroletProject} alt={alt("chevrolet")} sizes="(max-width: 767px) 42vw, 20vw" /><StoryAsset name="webmotors" alt={alt("webmotors")} sizes="(max-width: 767px) 42vw, 20vw" /></div>,
          <div key="carclick"><StoryAsset name="carclick" alt={alt("carclick")} sizes="(max-width: 767px) 42vw, 20vw" /><StoryAsset name="philco" alt={alt("philco")} sizes="(max-width: 767px) 42vw, 20vw" /><StoryAsset name="webProject6" alt={alt("webProject6")} sizes="(max-width: 767px) 42vw, 20vw" /></div>,
          <div key="digital"><StoryAsset name="project7" alt={alt("project7")} sizes="(max-width: 767px) 42vw, 20vw" /><StoryAsset name="project8" alt={alt("project8")} sizes="(max-width: 767px) 42vw, 20vw" /><StoryAsset name="project10" className={styles.wideProject} alt={alt("project10")} sizes="(max-width: 767px) 42vw, 20vw" /><StoryAsset name="project9" alt={alt("project9")} sizes="(max-width: 767px) 42vw, 20vw" /></div>,
        ]} />
        <section className={`${styles.wrap} ${styles.pizzaChapter}`}>
          <StoryMotion variant="object"><StoryAsset name="pizza" alt={content.pizzaAlt} sizes="(max-width: 767px) 75vw, 35vw" /></StoryMotion>
          <ScrollReveal tone="editorial"><h3>{content.pizzaTitle}</h3></ScrollReveal>
        </section>
        <section className={styles.museum} aria-labelledby="museum-title">
          <div className={`${styles.centered} ${styles.museumCopy}`}>
            <h3 id="museum-title">{content.museumTitle}</h3>
            <p>{content.museumBody}</p>
          </div>
          <StoryAsset name="museum" alt={content.museumAlt} className={styles.museumBackground} sizes="100vw" />
        </section>
        <StoryDialogue question={q} answer={e2010.answer} />
      </section>
    </div>
  );
}

export function SobreStoryPresent({ content }: { content: SobreContent }) {
  const era = eraOf(content, "2020");
  return (
    <section id="decade-2020" className={styles.era} aria-labelledby="era-2020">
      <EraCover year="2020" caption={era.caption} image="workshop" glitch />
      <ChapterIntro title={era.title} continuation={era.continuation} body={era.body} />
      <Device kind="remote" label={era.device} />
      <StoryMemoryRail title={<h3 id="hobbies-title">{content.hobbiesTitle}</h3>} titleId="hobbies-title" label={content.hobbiesLabel} direction="forward" long>
        {known(content.hobbies).map(memory => <StoryMemoryCard key={memory.image}>
          <div className={styles.memoryImage}>
            <StoryAsset name={memory.image} alt={memory.alt} sizes="(max-width: 767px) 75vw, 36vw" />
            {memory.image === "dance" ? <svg className={styles.danceLogo} viewBox="0 0 68 48" role="img" aria-label="YouTube"><rect width="68" height="48" rx="14" fill="#ff0033" /><path d="m27 14 18 10-18 10Z" fill="#fff" /></svg> : null}
          </div>
          <h4>{memory.title}</h4>
        </StoryMemoryCard>)}
      </StoryMemoryRail>
    </section>
  );
}

export function SobreStoryReflection({ content, locale = "pt" }: { content: SobreContent; locale?: SiteLocale }) {
  return <section className={styles.lifeChapter} aria-labelledby="life-title">
    <StoryBike label={content.bikeLabel} />
    <div className={styles.mountainScene}>
    <div className={styles.lifePanel}>
      <div className={styles.lifeCopy}>
        <ScrollReveal tone="editorial" className={styles.centered}>
          <h3 id="life-title">{content.lifeTitle}</h3>
          <p>{content.lifeBody}</p>
        </ScrollReveal>
      </div>
      <StoryLeadershipCases content={content} locale={locale} />
    </div>
    <div className={styles.mountainFrame}><StoryAsset name="mountain" alt={content.mountainAlt} className={styles.mountain} sizes="100vw" /></div>
    </div>
    <StoryDialogue question={content.dialogueQuestion} answer={eraOf(content, "2020").answer} />
  </section>;
}

export function SobreStoryFuture({ content }: { content: SobreContent }) {
  const era = eraOf(content, "2030");
  return <section id="decade-2030" className={`${styles.era} ${styles.future}`} aria-labelledby="era-2030">
    <EraCover year="2030" caption={era.caption} image="visionCover" />
    <ChapterIntro title={era.title} continuation={era.continuation} body={era.body} />
    <StoryVisionJourney question={content.visionQuestion} response={content.visionResponse} ending={[content.dialogueQuestion, era.answer]} restart={content.visionRestart} label={content.visionLabel} />
  </section>;
}
