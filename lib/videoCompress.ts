/**
 * 動画を 720p・低ビットレートで圧縮して Supabase の容量を節約する
 * ffmpeg.wasm を動的読み込み（初回のみ ~32MB）。読み込みが遅い場合はタイムアウトで null を返す
 */

const CORE_VERSION = '0.12.6';
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
const LOAD_TIMEOUT_MS = 45000; // 45秒でタイムアウト（携帯では読み込みが遅いため）

export type CompressProgress = { phase: 'loading' | 'compressing'; percent?: number };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/** 動画ファイルを圧縮して Blob を返す。失敗・タイムアウト時は null */
export async function compressVideo(
  file: File,
  onProgress?: (p: CompressProgress) => void
): Promise<Blob | null> {
  onProgress?.({ phase: 'loading' });
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile } = await import('@ffmpeg/util');

  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.({ phase: 'compressing', percent: Math.round(progress * 100) });
  });

  try {
    await withTimeout(
      ffmpeg.load({
        coreURL: `${CORE_BASE}/ffmpeg-core.js`,
        wasmURL: `${CORE_BASE}/ffmpeg-core.wasm`,
      }),
      LOAD_TIMEOUT_MS
    );
  } catch (e) {
    console.error('ffmpeg load failed or timeout', e);
    return null;
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const inputName = `input.${ext}`;
  const outputName = 'output.mp4';

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    // 720p、ビットレート 800k で圧縮（容量を抑える）
    const exitCode = await ffmpeg.exec([
      '-i', inputName,
      '-vf', 'scale=-2:720',
      '-b:v', '800k',
      '-maxrate', '800k',
      '-bufsize', '1600k',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputName,
    ]);
    if (exitCode !== 0) return null;
    const data = await ffmpeg.readFile(outputName);
    ffmpeg.terminate();
    return new Blob([data], { type: 'video/mp4' });
  } catch (e) {
    console.error('compress failed', e);
    ffmpeg.terminate();
    return null;
  }
}
