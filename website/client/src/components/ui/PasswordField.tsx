import { useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete: string;
  id: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-xl border border-line-2 bg-elevated px-4 pr-12 text-ink placeholder:text-ink-3 transition-colors duration-micro focus:border-tide focus:outline-none focus:ring-2 focus:ring-tide/30"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  score = Math.min(4, score);
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-err', 'bg-err', 'bg-warn', 'bg-gold', 'bg-ok'];
  const textColors = ['text-err', 'text-err', 'text-warn', 'text-gold', 'text-ok'];
  return {
    score: password ? score : 0,
    label: password ? labels[score] || labels[0] : '—',
    color: colors[score] || colors[0],
    textColor: textColors[score] || textColors[0],
  };
}

export function passwordSegmentActive(score: number, index: number) {
  if (score <= 0) return false;
  return index < Math.max(1, score);
}

export function PasswordRules({
  password,
  confirm,
  className = '',
}: {
  password: string;
  confirm?: string;
  className?: string;
}) {
  const rules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains a letter', ok: /[A-Za-z]/.test(password) },
    { label: 'Contains a number', ok: /[0-9]/.test(password) },
    ...(confirm !== undefined
      ? [{ label: 'Passwords match', ok: confirm.length > 0 && password === confirm }]
      : []),
  ];
  return (
    <ul className={`grid grid-cols-1 gap-1.5 rounded-xl border border-line bg-paper-2 px-4 py-3 sm:grid-cols-2 ${className}`}>
      {rules.map((rule) => (
        <li key={rule.label} className={`flex items-center gap-2 text-xs font-medium ${rule.ok ? 'text-ok' : 'text-ink-3'}`}>
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
              rule.ok ? 'border-ok/40 bg-ok/15 text-ok' : 'border-line-2 text-transparent'
            }`}
          >
            <Check className="h-2.5 w-2.5" />
          </span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
