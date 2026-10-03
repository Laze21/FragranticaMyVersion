/**
 * Shape of community_baselines.payload: aggregate counts that exist without individual vote
 * rows (imported from a licensed source, or generated demo data). The stats builder adds live
 * votes on top. Keep this file dependency-free: it is shared by the seed generator and the app.
 */
export interface BaselinePayload {
  label: string; // shown to people, e.g. "Demo figures"
  ratings: {
    count: number;
    hist: number[]; // index 0 = rating 1 ... index 9 = rating 10
    scent: [sum: number, n: number];
    performance: [sum: number, n: number];
    value: [sum: number, n: number];
    originality: [sum: number, n: number];
  };
  performance: {
    votes: number;
    longevity: number[]; // 6 buckets
    projectionOpening: number[]; // 5 levels
    projectionLater: number[]; // 5 levels
  };
  wear: { voters: number; fits: Record<string, number> };
  perceived: {
    voters: number;
    counts: Record<string, number>;
    byPhase: Partial<Record<'opening' | 'heart' | 'drydown', Record<string, number>>>;
  };
  character: { voters: number };
  collection: { own: number; had: number; want: number };
  wears: { total: number; last30: number };
  similarity?: Record<string, number>; // slug -> "smells similar" votes
}
