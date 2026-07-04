// DFA (Deterministic Finite Automaton) sensitive word filter
// Builds a trie for O(n) matching

export function buildTrie(words) {
  const root = {};
  for (const word of words) {
    let node = root;
    for (const char of word) {
      if (!node[char]) node[char] = {};
      node = node[char];
    }
    node.isEnd = true;
  }
  return root;
}

// Check text and return matched words and positions
export function checkText(root, text) {
  const matches = [];
  for (let i = 0; i < text.length; i++) {
    let node = root;
    let j = i;
    while (j < text.length && node[text[j]]) {
      node = node[text[j]];
      if (node.isEnd) {
        matches.push({
          word: text.slice(i, j + 1),
          start: i,
          end: j,
        });
        break; // longest match not needed for our use case
      }
      j++;
    }
  }
  return matches;
}

// Replace sensitive words with asterisks
export function censorText(root, text, char = '*') {
  const matches = checkText(root, text);
  if (!matches.length) return text;
  const arr = text.split('');
  for (const m of matches) {
    for (let i = m.start; i <= m.end; i++) arr[i] = char;
  }
  return arr.join('');
}

// Score text based on density of sensitive content (0-1)
export function scoreText(root, text) {
  if (!text) return 0;
  const matches = checkText(root, text);
  if (!matches.length) return 0;
  const totalChars = text.length;
  const hitChars = matches.reduce((sum, m) => sum + (m.end - m.start + 1), 0);
  return Math.min(1, hitChars / totalChars);
}
