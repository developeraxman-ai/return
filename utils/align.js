function getWordText(word) {
  return String(word?.word || word?.text || word || "");
}

function toSeconds(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text) {
  const normalized = normalizeText(text);
  return normalized ? normalized.split(" ") : [];
}

export function wordSimilarity(a, b) {
  const first = normalizeText(a);
  const second = normalizeText(b);

  if (!first || !second) {
    return 0;
  }

  if (first === second) {
    return 1;
  }

  if (
    first.length >= 3 &&
    second.length >= 3 &&
    (first.includes(second) || second.includes(first))
  ) {
    return 0.8;
  }

  return 0;
}

export function findBestSequentialMatch(tokens, whisperWords, startIndex = 0) {
  if (!tokens.length || !whisperWords?.length) {
    return { startWordIndex: -1, endWordIndex: -1, score: 0 };
  }

  const normalizedWords = whisperWords.map((word) => ({
    raw: word,
    normalized: normalizeText(getWordText(word)),
  }));

  const searchStart = Math.max(0, startIndex);
  const searchEnd = Math.min(normalizedWords.length, searchStart + 350);
  const maxLookAhead = Math.max(6, Math.ceil(tokens.length * 1.5));
  let bestMatch = { startWordIndex: -1, endWordIndex: -1, score: 0 };

  for (let candidateStart = searchStart; candidateStart < searchEnd; candidateStart += 1) {
    let wordIndex = candidateStart;
    let firstMatchedIndex = -1;
    let lastMatchedIndex = -1;
    let similarityTotal = 0;
    let matchedCount = 0;
    let skippedWords = 0;

    for (const token of tokens) {
      let found = false;
      let localSkips = 0;

      while (
        wordIndex < normalizedWords.length &&
        localSkips <= maxLookAhead
      ) {
        const similarity = wordSimilarity(token, normalizedWords[wordIndex].normalized);

        if (similarity > 0) {
          if (firstMatchedIndex === -1) {
            firstMatchedIndex = wordIndex;
          }

          lastMatchedIndex = wordIndex;
          similarityTotal += similarity;
          matchedCount += 1;
          wordIndex += 1;
          found = true;
          break;
        }

        wordIndex += 1;
        localSkips += 1;
        skippedWords += 1;
      }

      if (!found && matchedCount === 0) {
        break;
      }
    }

    if (matchedCount === 0) {
      continue;
    }

    const coverage = matchedCount / tokens.length;
    const averageSimilarity = similarityTotal / tokens.length;
    const span = Math.max(1, lastMatchedIndex - firstMatchedIndex + 1);
    const compactness = Math.min(1, tokens.length / span);
    const skipPenalty = Math.min(0.2, skippedWords * 0.01);
    const score =
      averageSimilarity * 0.72 + coverage * 0.22 + compactness * 0.06 - skipPenalty;

    if (score > bestMatch.score) {
      bestMatch = {
        startWordIndex: firstMatchedIndex,
        endWordIndex: lastMatchedIndex,
        score,
      };
    }
  }

  const minimumScore = tokens.length <= 2 ? 0.68 : 0.46;

  if (bestMatch.score < minimumScore) {
    return { startWordIndex: -1, endWordIndex: -1, score: Number(bestMatch.score.toFixed(2)) };
  }

  return {
    ...bestMatch,
    score: Number(bestMatch.score.toFixed(2)),
  };
}

export function alignScriptLinesToWhisperWords(lines, words) {
  if (!Array.isArray(lines) || !lines.length) {
    return [];
  }

  const whisperWords = Array.isArray(words) ? words : [];
  let nextSearchIndex = 0;
  let previousEndMs = 0;

  return lines.map((line) => {
    const tokens = tokenize(line.text);
    const match = findBestSequentialMatch(tokens, whisperWords, nextSearchIndex);
    const hasMatch = match.startWordIndex >= 0 && match.endWordIndex >= match.startWordIndex;

    if (hasMatch) {
      const firstWord = whisperWords[match.startWordIndex];
      const lastWord = whisperWords[match.endWordIndex];
      const startMs = Math.max(0, Math.round(toSeconds(firstWord?.start) * 1000 - 80));
      const endMs = Math.max(
        startMs + 300,
        Math.round(toSeconds(lastWord?.end) * 1000 + 120)
      );
      const matchedWords = whisperWords
        .slice(match.startWordIndex, match.endWordIndex + 1)
        .map((word) => ({
          word: getWordText(word),
          start: toSeconds(word?.start),
          end: toSeconds(word?.end),
        }));

      nextSearchIndex = match.endWordIndex + 1;
      previousEndMs = endMs;

      return {
        ...line,
        startMs,
        endMs,
        syncStatus: "matched",
        matchScore: match.score,
        matchedWords,
      };
    }

    const existingLength = Math.max(700, (line.endMs || 0) - (line.startMs || 0));
    const fallbackStartMs = Math.max(previousEndMs, line.startMs || 0);
    const fallbackEndMs = fallbackStartMs + existingLength;
    previousEndMs = fallbackEndMs;

    return {
      ...line,
      startMs: fallbackStartMs,
      endMs: fallbackEndMs,
      syncStatus: "fallback",
      matchScore: match.score || null,
      matchedWords: [],
    };
  });
}
