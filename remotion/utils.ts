/**
 * Windows / Unix のファイルパスを file:// URL に変換する。
 * Node.js の url モジュールを使わないため Remotion の webpack 環境でも動作する。
 */
export function toFileUrl(absPath: string): string {
  // バックスラッシュをスラッシュに変換（Windows 対応）
  const normalized = absPath.replace(/\\/g, "/");
  // 先頭スラッシュがない場合は追加（例: C:/... → /C:/...）
  const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `file://${withLeadingSlash}`;
}
