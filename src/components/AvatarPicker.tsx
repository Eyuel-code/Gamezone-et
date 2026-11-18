import { useRef, useState, type ChangeEvent } from 'react';
import { Check, Loader2, RotateCcw, Upload, AlertCircle } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import {
  DEFAULT_AVATAR_URL,
  GAMER_AVATARS,
  processAvatarFile,
} from '@/utils/avatarUtils';

interface AvatarPickerProps {
  value: string;
  onChange: (avatarUrl: string) => void;
  displayName?: string;
  compact?: boolean;
  label?: string;
}

export default function AvatarPicker({
  value,
  onChange,
  displayName,
  compact = false,
  label = 'Profile Picture',
}: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const isPreset = GAMER_AVATARS.some((preset) => preset.url === value);
  const isCustomUpload = Boolean(value && value.startsWith('data:image/') && !isPreset);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so re-selecting the exact same photo still triggers onChange
    e.target.value = '';
    if (!file) return;

    setError('');
    setProcessing(true);
    try {
      const processedUrl = await processAvatarFile(file);
      onChange(processedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process image file.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          {label}
        </span>
        {isCustomUpload && (
          <button
            type="button"
            onClick={() => {
              setError('');
              onChange(DEFAULT_AVATAR_URL);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" /> Use Website Preset
          </button>
        )}
      </div>

      {/* Natural, simple device upload bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <UserAvatar
              src={value}
              name={displayName}
              size={compact ? 'md' : 'lg'}
              className="ring-2 ring-primary-400/40"
            />
            {isCustomUpload && (
              <span
                title="Uploaded from your device"
                className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-success-500 text-ink-950 ring-2 ring-ink-950"
              >
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </div>

          <div className="min-w-0 sm:hidden">
            <p className="text-xs font-bold text-white">
              {isCustomUpload ? 'Custom photo ready' : 'Choose from your device'}
            </p>
            <p className="text-[11px] text-slate-400">PNG, JPG, WebP or GIF (max 10 MB)</p>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label="Upload custom profile picture from device"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={processing}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-400/40 bg-primary-500/15 px-3.5 py-2 text-xs font-bold text-primary-200 hover:bg-primary-500/25 hover:border-primary-400 transition-all cursor-pointer disabled:opacity-60"
            >
              {processing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{processing ? 'Preparing Photo...' : isCustomUpload ? 'Change Device Photo' : 'Upload from Device'}</span>
            </button>
          </div>
          <p className="hidden sm:block text-[11px] text-slate-400">
            {isCustomUpload
              ? 'Your device photo is cropped and saved automatically.'
              : 'Pick a photo from your phone or computer (PNG, JPG, WebP, GIF).'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-error-400/35 bg-error-400/10 px-3 py-2 text-xs text-error-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 simple built-in website preset choices */}
      <div>
        <p className="text-[11px] font-medium text-slate-400 mb-2">
          Or pick one of our 5 basic website profiles:
        </p>
        <div className="grid grid-cols-5 gap-2">
          {GAMER_AVATARS.map((preset) => {
            const active = value === preset.url;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                aria-label={`Select preset avatar: ${preset.label}`}
                onClick={() => {
                  setError('');
                  onChange(preset.url);
                }}
                title={preset.label}
                className={`group flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-all cursor-pointer ${
                  active
                    ? 'border-primary-400 bg-primary-500/15 ring-1 ring-primary-400/50'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <div className="relative">
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  {active && (
                    <span aria-hidden="true" className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-primary-500 text-ink-950">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold truncate max-w-full ${
                    active ? 'text-primary-200' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
