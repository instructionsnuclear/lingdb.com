"use client";

// Check if a token matches any of the target words or their inflected/conjugated variations
export function isVariationMatch(token: string, targetWords: string[]): boolean {
  if (!token || !targetWords.length) return false;
  const lowerToken = token.toLowerCase();

  for (const target of targetWords) {
    if (!target) continue;
    const lowerTarget = target.toLowerCase().trim();

    // 1. Direct exact match
    if (lowerToken === lowerTarget) return true;

    // Skip very short words (e.g. "in", "es") for fuzzy/stem matching to avoid false positives
    if (lowerTarget.length < 3) continue;

    // 2. Direct prefix / plural / declension match
    // e.g. "möglich" -> "mögliche", "möglichen", "mögliches"
    // "Reiseführer" -> "Reiseführers", "Reiseführern"
    if (
      lowerToken.startsWith(lowerTarget) &&
      lowerToken.length - lowerTarget.length <= 4
    ) {
      return true;
    }

    // 3. Verb stem derivation & vowel shifts (treffen -> trifft, treffe; abholen -> abholt)
    const stems: string[] = [];

    if (lowerTarget.endsWith("en") && lowerTarget.length >= 4) {
      stems.push(lowerTarget.slice(0, -2));
    } else if (
      (lowerTarget.endsWith("mak") || lowerTarget.endsWith("mek")) &&
      lowerTarget.length >= 5
    ) {
      stems.push(lowerTarget.slice(0, -3));
    } else if (
      (lowerTarget.endsWith("er") ||
        lowerTarget.endsWith("ir") ||
        lowerTarget.endsWith("ar")) &&
      lowerTarget.length >= 4
    ) {
      stems.push(lowerTarget.slice(0, -2));
    } else if (lowerTarget.endsWith("e") && lowerTarget.length >= 4) {
      stems.push(lowerTarget.slice(0, -1));
    }

    for (const stem of stems) {
      if (stem.length < 3) continue;

      // Direct stem match: e.g. "abhol" -> "abholt", "abhole", "abholte"
      if (
        lowerToken.startsWith(stem) &&
        lowerToken.length - stem.length <= 4
      ) {
        return true;
      }

      // Vowel shifts (e -> i / ie, a -> ä, au -> äu)
      const vowelShifts = [
        stem.replace(/e([^e]*)$/, "i$1"),   // treff -> triff, nehm -> nimm, helf -> hilf
        stem.replace(/e([^e]*)$/, "ie$1"),  // seh -> sieh, les -> lies
        stem.replace(/a([^a]*)$/, "ä$1"),   // fahr -> fähr, schlaf -> schläf
        stem.replace(/au([^a]*)$/, "äu$1"), // lauf -> läuf
        stem.replace(/o([^o]*)$/, "ue$1"),  // Spanish dormir -> duerm
        stem.replace(/e([^e]*)$/, "ie$1"),  // Spanish pensar -> piens
      ];

      for (const shifted of vowelShifts) {
        if (
          shifted !== stem &&
          lowerToken.startsWith(shifted) &&
          lowerToken.length - shifted.length <= 4
        ) {
          return true;
        }
      }

      // Past participle ge- prefix (e.g. gemacht, getroffen, geholt, abgeholt)
      if (
        lowerToken.startsWith("ge" + stem) ||
        (stem.length >= 4 && lowerToken.includes("ge" + stem.slice(2)))
      ) {
        return true;
      }
    }
  }

  return false;
}

// Safely highlight selected words and their grammatical variations in blue
export default function HighlightedPhraseText({
  phrase,
  wordsToHighlight,
}: {
  phrase: string;
  wordsToHighlight: string[];
}) {
  if (!wordsToHighlight || wordsToHighlight.length === 0) {
    return <span>{phrase}</span>;
  }

  // Expand multi-word targets if any (e.g. "ins Kino gehen" -> "ins", "Kino", "gehen")
  const expandedTargets = Array.from(
    new Set([
      ...wordsToHighlight,
      ...wordsToHighlight.flatMap((w) =>
        w.split(/\s+/).filter((part) => part.length >= 3),
      ),
    ]),
  );

  // Split phrase by word boundaries while preserving punctuation and spacing
  const tokens = phrase.split(
    /([a-zA-ZäöüÄÖÜßáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛçÇñÑ'-]+)/g,
  );

  return (
    <span>
      {tokens.map((token, i) => {
        const isWord =
          /^[a-zA-ZäöüÄÖÜßáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛçÇñÑ'-]+$/.test(token);

        if (isWord && isVariationMatch(token, expandedTargets)) {
          return (
            <span
              key={i}
              className="text-blue-600 dark:text-blue-400 font-bold bg-blue-500/15 dark:bg-blue-500/25 px-1 py-0.5 rounded transition-colors inline-block"
            >
              {token}
            </span>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </span>
  );
}
