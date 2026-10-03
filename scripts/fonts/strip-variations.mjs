// Make static OG fonts out of the variable subsets: Satori's font parser fails on their fvar table
// (the subset dropped the axis name records), and the share card only needs the default instance.
//   node scripts/fonts/strip-variations.mjs src/fonts/og/archivo.ttf src/fonts/og/newsreader-italic.ttf
import { readFileSync, writeFileSync } from 'node:fs';

const DROP = new Set(['fvar', 'gvar', 'avar', 'STAT', 'HVAR', 'MVAR', 'VVAR', 'cvar']);
const pad4 = (n) => (n + 3) & ~3;
const checksum = (buf) => {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 4) sum = (sum + buf.readUInt32BE(i)) >>> 0;
  return sum;
};

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file);
  const numTables = src.readUInt16BE(4);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    const tag = src.toString('latin1', o, o + 4);
    const offset = src.readUInt32BE(o + 8);
    const length = src.readUInt32BE(o + 12);
    if (DROP.has(tag)) continue;
    tables.push({ tag, data: src.subarray(offset, offset + length) });
  }
  if (tables.length === numTables) {
    console.log(`${file}: no variation tables`);
    continue;
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const n = tables.length;
  const headerLen = 12 + n * 16;
  let total = headerLen;
  for (const t of tables) total += pad4(t.data.length);
  const out = Buffer.alloc(total);
  out.writeUInt32BE(src.readUInt32BE(0), 0);
  out.writeUInt16BE(n, 4);
  const maxPow = Math.floor(Math.log2(n));
  out.writeUInt16BE(2 ** maxPow * 16, 6);
  out.writeUInt16BE(maxPow, 8);
  out.writeUInt16BE(n * 16 - 2 ** maxPow * 16, 10);
  let off = headerLen;
  let headOffset = -1;
  tables.forEach((t, i) => {
    const o = 12 + i * 16;
    out.write(t.tag, o, 4, 'latin1');
    const padded = Buffer.alloc(pad4(t.data.length));
    t.data.copy(padded);
    out.writeUInt32BE(checksum(padded), o + 4);
    out.writeUInt32BE(off, o + 8);
    out.writeUInt32BE(t.data.length, o + 12);
    padded.copy(out, off);
    if (t.tag === 'head') headOffset = off;
    off += padded.length;
  });
  if (headOffset >= 0) {
    out.writeUInt32BE(0, headOffset + 8);
    const adj = (0xb1b0afba - checksum(out)) >>> 0;
    out.writeUInt32BE(adj, headOffset + 8);
  }
  writeFileSync(file, out);
  console.log(`${file}: ${numTables} -> ${n} tables, ${src.length} -> ${out.length} bytes`);
}
