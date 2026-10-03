import 'server-only';
import { GLOSSARY } from '@/seed/glossary';
import type { SeedGlossaryTerm } from '@/seed/types';

/** Glossary is editorial content shipped with the app (versioned with code, reviewed like copy). */
export const GLOSSARY_BY_SLUG: Record<string, SeedGlossaryTerm> = Object.fromEntries(GLOSSARY.map((g) => [g.slug, g]));
export const glossaryTerms = () => [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
