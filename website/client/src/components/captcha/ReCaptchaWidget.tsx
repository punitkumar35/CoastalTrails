import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ReCaptchaWidgetProps {
  onVerify: (token: string) => void;
  onRequestChallenge?: () => void;
  isVerified?: boolean;
  forceChallenge?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ReCaptchaLogo: React.FC<{ className?: string }> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Blue top arc with arrow */}
    <path
      d="M24 6C14.06 6 6 14.06 6 24c0 3.84 1.2 7.4 3.24 10.35l3.88-3.1A13.9 13.9 0 0 1 11 24c0-7.18 5.82-13 13-13 3.6 0 6.86 1.47 9.21 3.84l-4.21 4.16H39V9l-4.5 4.5C31.5 10.5 27.9 8.5 24 8.5"
      fill="#4285F4"
    />
    {/* Navy bottom arc with arrow */}
    <path
      d="M24 42c9.94 0 18-8.06 18-18 0-3.84-1.2-7.4-3.24-10.35l-3.88 3.1A13.9 13.9 0 0 1 37 24c0 7.18-5.82 13-13 13-3.6 0-6.86-1.47-9.21-3.84l4.21-4.16H9V39l4.5-4.5C16.5 37.5 20.1 39.5 24 39.5"
      fill="#1A73E8"
    />
    {/* Green inner node */}
    <circle cx="24" cy="24" r="5" fill="#34A853" />
  </svg>
);

export const ReCaptchaWidget: React.FC<ReCaptchaWidgetProps> = ({
  onVerify,
  onRequestChallenge,
  isVerified = false,
  forceChallenge = false,
  disabled = false,
  className,
}) => {
  const [checking, setChecking] = useState(false);
  const [localVerified, setLocalVerified] = useState(isVerified);

  const handleClick = () => {
    if (disabled || checking || localVerified) return;

    setChecking(true);

    // If challenge is explicitly required (e.g. rate-limit or suspicious attempts)
    if (forceChallenge && onRequestChallenge) {
      setTimeout(() => {
        setChecking(false);
        onRequestChallenge();
      }, 450);
      return;
    }

    // Normal client telemetry check: simulate quick bot heuristic evaluation
    setTimeout(() => {
      setChecking(false);
      if (onRequestChallenge && Math.random() < 0.25) {
        // Occasionally trigger elevated visual challenge for test realism
        onRequestChallenge();
      } else {
        setLocalVerified(true);
        const token = `CT_CAPTCHA_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        try {
          sessionStorage.setItem('ct_captcha_token', token);
        } catch {}
        onVerify(token);
      }
    }, 600);
  };

  const verified = isVerified || localVerified;

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex w-full max-w-[316px] select-none items-center justify-between rounded-md border border-[#d3d3d3] bg-[#f9f9f9] px-3.5 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all dark:border-white/15 dark:bg-[#202124] dark:shadow-none',
        !verified && !disabled && 'cursor-pointer hover:border-[#b0b0b0] dark:hover:border-white/30',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      {/* Checkbox Area */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || verified}
          aria-label="Verify you are human"
          className={cn(
            'relative flex h-7 w-7 items-center justify-center rounded-[3px] border-2 transition-all',
            verified
              ? 'border-transparent bg-transparent'
              : checking
                ? 'border-transparent bg-transparent'
                : 'border-[#c1c1c1] bg-white hover:border-[#8e8e8e] dark:border-white/40 dark:bg-ink',
          )}
        >
          {checking && (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1a73e8] border-t-transparent dark:border-[#4285f4]" />
          )}

          {verified && (
            <div className="flex h-7 w-7 animate-in zoom-in-75 duration-200 items-center justify-center text-[#0f9d58] dark:text-[#34a853]">
              <Check className="h-6 w-6 stroke-[3.2]" />
            </div>
          )}
        </button>

        <span className="text-[13px] font-normal tracking-tight text-[#282828] dark:text-white/90">
          {verified ? 'Human verified' : "I'm not a robot"}
        </span>
      </div>

      {/* reCAPTCHA Brand Box */}
      <div className="flex flex-col items-center pl-2">
        <ReCaptchaLogo className="h-7 w-7 transition-transform group-hover:scale-105" />
        <span className="mt-0.5 text-[9px] font-medium tracking-tight text-[#555] dark:text-white/70">
          reCAPTCHA
        </span>
        <div className="flex items-center gap-1 text-[8px] text-[#777] dark:text-white/50">
          <span className="hover:underline">Privacy</span>
          <span>·</span>
          <span className="hover:underline">Terms</span>
        </div>
      </div>
    </div>
  );
};
