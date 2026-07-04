import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';

export const useTotalImageSize = (images: string[]) => {
  const [sizeKB, setSizeKB] = useState<number | null>(null);

  useEffect(() => {
    if (!images.length) { setSizeKB(0); return; }
    let cancelled = false;

    (async () => {
      let total = 0;
      for (const uri of images) {
        try {
          if (uri.startsWith('file://') || uri.startsWith('content://')) {
            const info = await FileSystem.getInfoAsync(uri, { size: true });
            if (info.exists && (info as any).size) total += (info as any).size;
          } else {
            const res = await fetch(uri, { method: 'HEAD' });
            const cl = res.headers.get('content-length');
            if (cl) total += parseInt(cl, 10);
          }
        } catch {}
      }
      if (!cancelled) setSizeKB(Math.round(total / 1024));
    })();

    return () => { cancelled = true; };
  }, [images]);

  return sizeKB;
};