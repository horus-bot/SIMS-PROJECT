export function levenshteinDistance(s1: string, s2: string): number {
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function fuzzyScore(query: string, text: string): number {
  const qLower = query.toLowerCase().trim();
  const tLower = text.toLowerCase().trim();
  
  if (!qLower) return 100;
  if (tLower === qLower) return 100;
  if (tLower.startsWith(qLower)) return 80;
  if (tLower.includes(` ${qLower}`)) return 70;
  if (tLower.includes(qLower)) return 60;
  
  const qWords = qLower.split(/\s+/);
  const tWords = tLower.split(/\s+/);
  
  let totalScore = 0;
  let matches = 0;

  for (const qw of qWords) {
    if (qw.length < 2) continue;
    let bestLd = Infinity;
    for (const tw of tWords) {
      if (tw.startsWith(qw)) { bestLd = 0; break; }
      const ld = levenshteinDistance(qw, tw);
      if (ld < bestLd) bestLd = ld;
    }
    
    // Prevent digits like "4203" from matching "4101" just because they are close in Levenshtein
    const isNumeric = /^\d+$/.test(qw);
    const threshold = isNumeric ? 0 : (qw.length <= 4 ? 1 : 2);
    
    if (bestLd <= threshold) {
      matches++;
      totalScore += (10 - bestLd); 
    }
  }

  if (matches > 0 && matches >= Math.ceil(qWords.length / 2)) {
    return 20 + totalScore;
  }
  return 0;
}
