export interface GamerAvatarPreset {
  id: string;
  label: string;
  url: string;
}

function makeAvatarSvg(bg1: string, bg2: string, accent: string, hair: string, badge: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="120" height="120" rx="28" fill="url(#g)"/><circle cx="60" cy="46" r="22" fill="#f5d0b5"/><path d="M36 44c0-16 11-26 24-26s24 10 24 26c-4-9-13-13-24-13s-20 4-24 13z" fill="${hair}"/><rect x="33" y="42" width="54" height="10" rx="5" fill="${accent}" opacity="0.9"/><circle cx="52" cy="48" r="2.8" fill="#0f172a"/><circle cx="68" cy="48" r="2.8" fill="#0f172a"/><path d="M54 57c3.5 3 8.5 3 12 0" stroke="#7c2d12" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M26 114c2-22 15-34 34-34s32 12 34 34z" fill="${accent}"/><text x="60" y="106" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="14" fill="#ffffff">${badge}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 5 clean, built-in website preset avatars
export const GAMER_AVATARS: GamerAvatarPreset[] = [
  {
    id: 'alok',
    label: 'DJ Alok',
    url: makeAvatarSvg('#0ea5e9', '#1e3a8a', '#38bdf8', '#1e293b', 'ALOK'),
  },
  {
    id: 'wolf',
    label: 'Wolfrahh',
    url: makeAvatarSvg('#ef4444', '#7f1d1d', '#f97316', '#f8fafc', 'WOLF'),
  },
  {
    id: 'chrono',
    label: 'Chrono',
    url: makeAvatarSvg('#8b5cf6', '#312e81', '#22d3ee', '#0f172a', 'CR7'),
  },
  {
    id: 'kelly',
    label: 'Kelly',
    url: makeAvatarSvg('#f59e0b', '#9a3412', '#facc15', '#78350f', 'KELLY'),
  },
  {
    id: 'racer',
    label: 'Drift King',
    url: makeAvatarSvg('#10b981', '#064e3b', '#34d399', '#111827', 'APEX'),
  },
];

export const DEFAULT_AVATAR_URL = GAMER_AVATARS[0].url;

export function isImageAvatar(avatar?: string | null): boolean {
  if (!avatar) return false;
  const trimmed = avatar.trim();
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  );
}

export function getSafeAvatarUrl(avatar?: string | null): string {
  if (!avatar || !avatar.trim()) return DEFAULT_AVATAR_URL;
  const trimmed = avatar.trim();
  if (!isImageAvatar(trimmed)) return DEFAULT_AVATAR_URL;
  return trimmed.startsWith('http://') ? `https://${trimmed.slice('http://'.length)}` : trimmed;
}

export function getInitials(name?: string | null): string {
  const clean = (name || 'GZ').trim();
  if (!clean) return 'GZ';
  const parts = clean.split(/[\s_\-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

const ACCEPTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

const MAX_INPUT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_DATA_URL_CHARS = 25000;

/**
 * Reads an image file selected from the user's device, center-crops it to a 160x160 square,
 * compresses it iteratively so it fits cleanly inside Firestore's string limit (< 25,000 chars),
 * and returns a clean data URL ready to display and persist.
 */
export async function processAvatarFile(file: File): Promise<string> {
  if (!file) {
    throw new Error('No file was selected.');
  }

  const mime = (file.type || '').toLowerCase();
  const hasImageExt = /\.(png|jpe?g|webp|gif)$/i.test(file.name);
  if (!ACCEPTED_MIME_TYPES.has(mime) && !hasImageExt) {
    throw new Error('Please choose a PNG, JPEG, WebP, or GIF image file.');
  }

  if (file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error('Image is too large. Please choose a photo under 10 MB.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not read the selected image file.'));
      image.src = objectUrl;
    });

    const sourceW = img.naturalWidth || img.width;
    const sourceH = img.naturalHeight || img.height;
    if (!sourceW || !sourceH) {
      throw new Error('Invalid image dimensions.');
    }

    const side = Math.min(sourceW, sourceH);
    const sx = Math.floor((sourceW - side) / 2);
    const sy = Math.floor((sourceH - side) / 2);

    const sizes = [160, 128, 96];
    const formats = ['image/webp', 'image/jpeg'];
    const qualities = [0.85, 0.72, 0.58, 0.45];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Your browser does not support image resizing.');
    }

    for (const targetSize of sizes) {
      canvas.width = targetSize;
      canvas.height = targetSize;
      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);

      for (const fmt of formats) {
        for (const q of qualities) {
          const dataUrl = canvas.toDataURL(fmt, q);
          if (dataUrl.startsWith('data:image/') && dataUrl.length <= MAX_DATA_URL_CHARS) {
            return dataUrl;
          }
        }
      }
    }

    throw new Error('Could not compress this image small enough. Please choose another photo.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
