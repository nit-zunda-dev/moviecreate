export interface VoicevoxSpeakerConfig {
  /**
   * VOICEVOXエンジンのベースURL。
   */
  baseUrl: string;
  /**
   * デフォルトで使用するspeakerId（例: ずんだもんノーマル=3）。
   */
  defaultSpeakerId: number;
  /**
   * 話者名 → speakerId の簡易マッピング（任意）。
   */
  nameToSpeakerId: Record<string, number>;
}

export function getVoicevoxConfig(): VoicevoxSpeakerConfig {
  return {
    baseUrl: process.env.VOICEVOX_BASE_URL || "http://localhost:50021",
    defaultSpeakerId: 3,
    nameToSpeakerId: {
      zundamon: 3,
      shikoku_metan: 2,
    },
  };
}

export function resolveSpeakerIdFromName(name?: string): number | undefined {
  if (!name) return undefined;
  const config = getVoicevoxConfig();
  return config.nameToSpeakerId[name];
}


