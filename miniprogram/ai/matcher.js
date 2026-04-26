/**
 * Lightweight keyword matcher for the local Su Dongpo Q&A library.
 * No external deps — runs in mini program & node.
 */

const PUNCT = /[\s　-〿＀-￯，。！？、；："'()（）《》【】]/;

function tokenize(input) {
  if (!input || !input.trim()) return [];
  const cleaned = input.replace(new RegExp(PUNCT.source, 'g'), '');
  const tokens = new Set();
  for (const ch of cleaned) {
    if (ch) tokens.add(ch);
  }
  for (let i = 0; i < cleaned.length - 1; i++) {
    tokens.add(cleaned.slice(i, i + 2));
  }
  return [...tokens];
}

function score(queryTokens, keywords) {
  const set = new Set(queryTokens);
  let s = 0;
  for (const kw of keywords) {
    if (set.has(kw)) { s += 2; continue; }
    for (const ch of kw) if (set.has(ch)) { s += 0.2; break; }
  }
  return s;
}

function match(query, library, persona, opts = {}) {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return { qaId: null, score: 0, answer: persona[0] };
  }
  let best = { qaId: null, score: 0, answer: null };
  for (const qa of library) {
    const s = score(tokens, qa.keywords);
    if (s > best.score) best = { qaId: qa.id, score: s, answer: qa.answer };
  }
  if (best.score === 0) {
    const idx = (opts.fallbackIndex ?? 0) % persona.length;
    return { qaId: null, score: 0, answer: persona[idx] };
  }
  return best;
}

module.exports = { tokenize, score, match };
