import type { VoicevoxAudioQuery } from "../voicevox/client";

/**
 * VOICEVOX の AudioQuery から発話所要時間（秒）を算出する。
 *
 * duration = (prePhonemeLength + Σ mora lengths + postPhonemeLength) / speedScale
 */
export function calcDurationFromQuery(query: VoicevoxAudioQuery): number {
  const speedScale = query.speedScale ?? 1.0;
  const prePhoneme = query.prePhonemeLength ?? 0;
  const postPhoneme = query.postPhonemeLength ?? 0;

  let moraTotal = 0;
  if (query.accent_phrases) {
    for (const phrase of query.accent_phrases) {
      for (const mora of phrase.moras) {
        moraTotal += (mora.consonant_length ?? 0) + mora.vowel_length;
      }
      if (phrase.pause_mora) {
        moraTotal += (phrase.pause_mora.consonant_length ?? 0) + phrase.pause_mora.vowel_length;
      }
    }
  }

  const total = (prePhoneme + moraTotal + postPhoneme) / speedScale;
  return total;
}
