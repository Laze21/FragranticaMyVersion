import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { averageCharacter, getBrand, signatureTrail } from "@/lib/data/people";
import { brandSlugs } from "@/lib/data/static-params";
import { FragranceCard } from "@/components/cards/FragranceCard";
import { CharacterBars } from "@/components/scent/CharacterBars";
import { TrailThumb } from "@/components/scent/TrailThumb";
import { TrailMark } from "@/components/shell/TrailMark";
import { Icon } from "@/components/Icon";
import { Term } from "@/components/ui/Term";
import styles from "../../editorial.module.css";

export const revalidate = 600;
export async function generateStaticParams() {
  return (await brandSlugs()).map((slug) => ({ slug }));
}

const KIND: Record<string, React.ReactNode> = {
  designer: <Term slug="designer">Designer house</Term>,
  niche: <Term slug="niche">Niche house</Term>,
  heritage: "Heritage house",
  indie: "Independent house",
  mass: "High-street brand",
  regional: "Middle Eastern house",
};
const COUNTRY = new Intl.DisplayNames(["en"], { type: "region" });
/* The ranked rows earn their place only once a grid is too long to rank by eye. */
const RANKED_LIST_FROM = 8;

export async function generateMetadata(
  props: PageProps<"/house/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const d = await getBrand(slug);
  if (!d) notFound();
  if (!d) return { title: "House not found" };
  return {
    title: `${d.brand.name} fragrances`,
    description: String(d.brand.description ?? ""),
    alternates: { canonical: `/house/${slug}` },
  };
}

export default async function HousePage(props: PageProps<"/house/[slug]">) {
  const [{ slug }, search] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const d = await getBrand(slug);
  if (!d) notFound();
  const b = d.brand;
  const name = String(b.name);
  const n = d.cards.length;
  const sort = search.sort === "shelved" ? "shelved" : "newest";
  const byShelves = [...d.cards].sort(
    (a, c) =>
      c.ownCount - a.ownCount || (c.ratingAvg ?? 0) - (a.ratingAvg ?? 0),
  );
  const shelfRank = new Map(byShelves.map((c, i) => [c.id, i + 1]));
  const shown = sort === "shelved" ? byShelves : d.cards;
  const trail = signatureTrail(d.cards);
  const sig = averageCharacter(d.cards);

  return (
    <article className={`page ${styles.wide}`}>
      <div className={styles.band}>
        <header className={styles.identity}>
          <p className={styles.kicker}>{KIND[b.kind as string] ?? "House"}</p>
          <h1 className={styles.title}>{name}</h1>
          <p className={styles.facts}>
            {[b.city, b.country ? COUNTRY.of(String(b.country)) : null]
              .filter(Boolean)
              .join(", ")}
            {b.founded_year ? ` · founded ${b.founded_year}` : ""}
            {b.parent_company ? ` · part of ${b.parent_company}` : ""}
          </p>
          {b.description ? (
            <p className={styles.lede}>{String(b.description)}</p>
          ) : null}
          {b.website_url || b.wikidata_qid ? (
            <p className={styles.links}>
              {b.website_url ? (
                <a
                  href={String(b.website_url)}
                  target="_blank"
                  rel="noopener nofollow"
                >
                  Official site <Icon name="external" size={14} />
                </a>
              ) : null}
              {b.wikidata_qid ? (
                <a
                  href={`https://www.wikidata.org/wiki/${b.wikidata_qid}`}
                  target="_blank"
                  rel="noopener"
                >
                  Wikidata {String(b.wikidata_qid)}{" "}
                  <Icon name="external" size={14} />
                </a>
              ) : null}
            </p>
          ) : null}
        </header>
        <aside className={styles.sig} aria-label={`${name} signature`}>
          {trail ? (
            <figure className={styles.trail}>
              <TrailThumb
                input={trail}
                size="feature"
                width={320}
                height={56}
              />
              <figcaption className={styles.trailCap}>
                <TrailMark className={styles.trailMark} />
                House signature · averaged over {n}
              </figcaption>
            </figure>
          ) : null}
          <CharacterBars
            vec={sig}
            limit={5}
            label={`${name} signature character`}
          />
          <p className={styles.sigNote}>
            {n === 1
              ? "One fragrance here, so this is its character, not a house style."
              : `What ${n} fragrances here have in common. A small sample, not a verdict.`}
          </p>
        </aside>
      </div>

      <section className={styles.catalogue} aria-labelledby="all">
        <div className={styles.catHead}>
          <h2 id="all" className={styles.h2}>
            {n === 1
              ? `The one ${name} fragrance here`
              : `Every ${name} fragrance here`}
          </h2>
          {n > 1 && (
            <nav className={styles.toggles} aria-label="Order">
              <Link
                href={`/house/${slug}`}
                aria-current={sort === "newest" ? "true" : undefined}
              >
                newest first
              </Link>
              <Link
                href={`/house/${slug}?sort=shelved`}
                aria-current={sort === "shelved" ? "true" : undefined}
              >
                most shelved
              </Link>
            </nav>
          )}
        </div>
        {n > 1 && (
          <p className={styles.catNote}>
            Each bottle carries its shelf rank and score: 1 · 7.5 is the most
            shelved, rated 7.5.
          </p>
        )}
        <ul role="list" className={styles.grid}>
          {shown.map((c) => (
            <li key={c.id}>
              <span
                className={styles.rank}
                aria-label={`Shelf rank ${shelfRank.get(c.id)}${c.ratingAvg && c.ratingCount >= 5 ? `, rated ${c.ratingAvg.toFixed(1)}` : ""}`}
              >
                {shelfRank.get(c.id)}
                {c.ratingAvg && c.ratingCount >= 5
                  ? ` · ${c.ratingAvg.toFixed(1)}`
                  : ""}
              </span>
              <FragranceCard card={c} showYear />
            </li>
          ))}
        </ul>
      </section>

      {n > RANKED_LIST_FROM && (
        <section className={styles.catalogue} aria-labelledby="most">
          <div className={styles.catHead}>
            <h2 id="most" className={styles.h2}>
              On the most shelves
            </h2>
          </div>
          <ul role="list" className={styles.rows}>
            {byShelves.slice(0, 5).map((c, i) => (
              <li key={c.id}>
                <FragranceCard
                  card={c}
                  variant="row"
                  rank={i + 1}
                  metric={
                    c.ownCount
                      ? `${c.ownCount} ${c.ownCount === 1 ? "shelf" : "shelves"}`
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
