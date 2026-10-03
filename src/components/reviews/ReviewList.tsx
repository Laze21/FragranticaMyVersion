"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { myHelpfulVotes } from "@/app/actions/reviews";
import { useViewer } from "@/components/viewer/ViewerProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ReviewView } from "@/lib/data/types";
import { useRadioGroup } from "@/lib/hooks/useRadioGroup";
import { formatNumber } from "@/lib/scent/read";
import { QuickTakeCard, ReviewItem } from "./ReviewItem";
import styles from "./ReviewList.module.css";

interface Counts {
  total: number;
  quick: number;
  full: number;
}
const SORTS = [
  { key: "helpful", label: "Most helpful" },
  { key: "recent", label: "Recent" },
  { key: "highest", label: "Highest" },
  { key: "lowest", label: "Lowest" },
] as const;
const KINDS = [
  { key: "", label: "All" },
  { key: "quick", label: "Quick takes" },
  { key: "full", label: "Full" },
] as const;
const FOCUS = [
  { key: "", label: "Any angle" },
  { key: "performance", label: "Performance" },
  { key: "scent", label: "Scent" },
  { key: "value", label: "Value" },
  { key: "beginner", label: "Beginner view" },
  { key: "long_term", label: "Long-term owners" },
  { key: "first_impression", label: "First impressions" },
  { key: "comparison", label: "Comparisons" },
];
const PAGE_SIZE = 20;
const SORT_KEYS = SORTS.map((x) => x.key);
const KIND_KEYS = KINDS.map((x) => x.key);

/**
 * Reviews you can navigate. The first page is server-rendered; sorting and filtering re-fetch
 * from page zero under a pending hairline; more arrive twenty at a time on request, never by
 * scrolling. Three quick takes lead when there are enough of them to be a choice. With nothing
 * written yet, the empty state says so about this fragrance and holds the way in.
 */
export function ReviewList({
  slug,
  initial,
  counts,
  initialHasMore,
  name,
  includesBaseline,
}: {
  slug: string;
  initial: ReviewView[];
  counts: Counts;
  initialHasMore: boolean;
  /** The fragrance's name, for the empty state's sentence. */
  name?: string;
  /** True when the votes above are demo figures, so the empty state can say why it is honest. */
  includesBaseline?: boolean;
}) {
  const { viewer } = useViewer();
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sort, setSort] = useState<(typeof SORT_KEYS)[number]>("helpful");
  const [kind, setKind] = useState<(typeof KIND_KEYS)[number]>("");
  const [focus, setFocus] = useState("");
  const [owners, setOwners] = useState(false);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [slow, setSlow] = useState(false);
  const [mineHelpful, setMineHelpful] = useState<string[]>([]);
  const first = useRef(true);
  const now = useRef(Date.now());
  const sortGroup = useRadioGroup({
    values: SORT_KEYS,
    value: sort,
    onChange: setSort,
    orientation: "horizontal",
  });
  const kindGroup = useRadioGroup({
    values: KIND_KEYS,
    value: kind,
    onChange: setKind,
    orientation: "horizontal",
  });

  const load = async (p: number, append: boolean) => {
    setState("loading");
    // The hairline only appears for a wait worth showing; a fast answer never flashes it.
    const timer = setTimeout(() => setSlow(true), 150);
    try {
      const qs = new URLSearchParams({
        sort,
        page: String(p),
        pageSize: String(PAGE_SIZE),
      });
      if (kind) qs.set("kind", kind);
      if (focus) qs.set("focus", focus);
      if (owners) qs.set("owners", "1");
      const res = await fetch(`/api/fragrance/${slug}/reviews?${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        reviews: ReviewView[];
        hasMore: boolean;
      };
      setItems((xs) => (append ? [...xs, ...data.reviews] : data.reviews));
      setHasMore(data.hasMore);
      setPage(p);
      setState("idle");
    } catch {
      setState("error");
    } finally {
      clearTimeout(timer);
      setSlow(false);
    }
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void load(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, kind, focus, owners]);

  useEffect(() => {
    if (viewer && items.length)
      void myHelpfulVotes(items.map((i) => i.id)).then(setMineHelpful);
  }, [viewer, items]);

  if (counts.total === 0) {
    const who = name ?? "this one";
    return (
      <EmptyState
        icon="comment"
        title={`Nobody has written about ${who} yet.`}
        line={
          includesBaseline
            ? "The votes above are demo figures. Reviews are written by people, so this stays empty until someone writes one."
            : "Worn it? A two-sentence quick take helps the next person more than you’d think."
        }
        action={
          viewer ? (
            <Link href={`/fragrance/${slug}/review`} className="btn">
              Write the first quick take
            </Link>
          ) : (
            <Link
              href={`/sign-in?next=${encodeURIComponent(`/fragrance/${slug}/review`)}`}
              className="btn btn--quiet"
            >
              Sign in to write the first one
            </Link>
          )
        }
      />
    );
  }

  // The rail is a choice of quick takes, not the list again: it needs enough to choose from.
  const rail =
    counts.quick >= 3 && counts.total >= 6
      ? initial
          .filter((r) => r.kind === "quick" && r.status === "published")
          .slice(0, 3)
      : [];
  // The count of what is left is only known for the unfiltered list and the two kind filters.
  const known =
    !focus && !owners
      ? kind === "quick"
        ? counts.quick
        : kind === "full"
          ? counts.full
          : counts.total
      : null;
  const left =
    known !== null
      ? Math.max(
          0,
          known - items.filter((r) => r.status === "published").length,
        )
      : null;

  return (
    <div className={styles.wrap}>
      {rail.length > 0 && (
        <div className={styles.railWrap}>
          <p className={styles.railHead}>Quick takes</p>
          <ul role="list" className={styles.rail}>
            {rail.map((r) => (
              <QuickTakeCard key={r.id} review={r} />
            ))}
          </ul>
        </div>
      )}

      {/* One review needs no sorting or filtering; the chips arrive with the second. */}
      {counts.total >= 2 && (
        <div className={styles.controls}>
          <div
            className={styles.group}
            {...sortGroup.group()}
            aria-label="Sort reviews"
          >
            {SORTS.map((x) => (
              <button
                key={x.key}
                type="button"
                className="chip"
                {...sortGroup.item(x.key)}
              >
                {x.label}
              </button>
            ))}
          </div>
          <span className={styles.divider} aria-hidden />
          <div
            className={styles.group}
            {...kindGroup.group()}
            aria-label="Review length"
          >
            {KINDS.map((x) => (
              <button
                key={x.key}
                type="button"
                className="chip"
                {...kindGroup.item(x.key)}
              >
                {x.label}
                {x.key && (
                  <span className={`${styles.count} tnum`}>
                    {" "}
                    {formatNumber(
                      x.key === "quick" ? counts.quick : counts.full,
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>
          <label className={styles.select}>
            <span className="visually-hidden">Angle</span>
            <select
              className="select"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            >
              {FOCUS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={owners}
              onChange={(e) => setOwners(e.target.checked)}
            />{" "}
            Owners only
          </label>
        </div>
      )}
      <div
        className={styles.hairline}
        data-on={slow || undefined}
        aria-hidden
      />

      <div aria-live="polite" aria-busy={state === "loading"}>
        {items.length === 0 && state !== "loading" && (
          <p className={styles.none}>
            No reviews match those filters.{" "}
            {focus || owners || kind ? "Loosen one." : ""}
          </p>
        )}
        {items.map((r) => (
          <ReviewItem
            key={r.id}
            review={r}
            helpfulByMe={mineHelpful.includes(r.id)}
            now={now.current}
          />
        ))}
      </div>
      {state === "error" && (
        <p className={styles.none}>
          The reviews didn’t load.{" "}
          <button
            type="button"
            className="btn btn--bare btn--small"
            onClick={() => void load(page, false)}
          >
            Try again
          </button>
        </p>
      )}
      {hasMore && (
        <button
          type="button"
          className={`btn btn--quiet ${styles.moreBtn}`}
          onClick={() => void load(page + 1, true)}
          disabled={state === "loading"}
        >
          {state === "loading"
            ? "Loading…"
            : left !== null && left > 0
              ? `Show ${Math.min(PAGE_SIZE, left)} more · ${formatNumber(left)} left`
              : `Show ${PAGE_SIZE} more`}
        </button>
      )}
      {!hasMore && items.length > PAGE_SIZE && (
        <p className={styles.end}>
          That’s all {formatNumber(items.length)} of them.
        </p>
      )}
    </div>
  );
}
