// Stand-in for the `server-only` package under vitest: the real one throws outside a React server
// bundle, and pure helpers that happen to live beside a database module still deserve unit tests.
export {};
