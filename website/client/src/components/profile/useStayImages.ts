import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function useStayImages(): Record<string, string> {
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    api
      .getHomestays()
      .then((stays) => {
        if (!active) return;
        const map: Record<string, string> = {};
        for (const stay of stays) {
          if (stay.imageUrls && stay.imageUrls.length > 0) map[stay.id] = stay.imageUrls[0];
        }
        setImages(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return images;
}
