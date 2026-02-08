/**
 * 画像ファイルを WebP に変換する。
 * チャット添付などで送信前に呼び出す。
 */
const MAX_SIZE = 1920; // 長辺の最大ピクセル
const WEBP_QUALITY = 0.85;

export function imageFileToWebp(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      let width = w;
      let height = h;
      if (w > MAX_SIZE || h > MAX_SIZE) {
        if (w >= h) {
          width = MAX_SIZE;
          height = Math.round((h * MAX_SIZE) / w);
        } else {
          height = MAX_SIZE;
          width = Math.round((w * MAX_SIZE) / h);
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2d not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('toBlob failed'));
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/i, '') || 'image';
          const webpFile = new File([blob], `${baseName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(webpFile);
        },
        'image/webp',
        WEBP_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}
