import { useState, useEffect } from 'react';
import { Gamepad2 } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  eager?: boolean;
  decorative?: boolean;
}

export default function ResilientImage({
  src,
  alt,
  className = 'h-full w-full object-cover',
  fallbackLabel,
  eager = false,
  decorative = false,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative ? true : undefined}
        className={`relative flex flex-col items-center justify-center overflow-hidden bg-[#0c1024] text-center select-none ${className}`}
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(0, 245, 212, 0.24), transparent 52%), radial-gradient(circle at 82% 24%, rgba(139, 92, 246, 0.34), transparent 56%), radial-gradient(circle at 55% 88%, rgba(236, 72, 153, 0.22), transparent 55%)',
        }}
      >
        <div
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-cyan-300"
          aria-hidden="true"
        >
          <Gamepad2 className="h-5 w-5" />
        </div>
        {(fallbackLabel || (!decorative && alt)) && (
          <span className="mt-2 max-w-[85%] truncate px-2 text-[11px] font-semibold text-slate-200">
            {fallbackLabel || alt}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={decorative ? '' : alt}
      aria-hidden={decorative ? true : undefined}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
