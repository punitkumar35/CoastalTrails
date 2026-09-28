import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, BadgeCheck, Camera, CheckCircle2, Save, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DatePicker } from '../../components/ui/DatePicker';
import { Field, Input } from '../../components/ui/Input';
import type { ProfileContextValue } from '../../components/profile/ProfileLayout';
import { getTodayISO } from '../../lib/dates';
import { easeOut } from '../../lib/motion';
import { api } from '../../services/api';

export function ProfileEditPage() {
  const { profile, onUserUpdate } = useOutletContext<ProfileContextValue>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name || '');
  const [dob, setDob] = useState(profile?.date_of_birth ? String(profile.date_of_birth).slice(0, 10) : '');
  const [photo, setPhoto] = useState(profile?.profile_image || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const initial = (profile?.name || 'T').charAt(0).toUpperCase();
  const memberSince = profile?.member_since
    ? new Date(String(profile.member_since).replace(' ', 'T')).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 3800);
    return () => clearTimeout(timer);
  }, [flash]);

  async function handlePhotoChange(file?: File) {
    if (!file) return;
    setUploading(true);
    setFlash(null);
    try {
      const { url } = await api.uploadProfilePhoto(file);
      setPhoto(url);
      if (profile) onUserUpdate({ ...profile, profile_image: url });
      setFlash({ tone: 'ok', text: 'Profile picture updated.' });
    } catch (err) {
      setFlash({ tone: 'err', text: err instanceof Error ? err.message : 'Could not upload the photo.' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFlash(null);
    try {
      const updated = await api.updateProfile({ name: name.trim(), date_of_birth: dob || null });
      const merged = { ...(profile || {}), ...updated };
      onUserUpdate(merged);
      setFlash({ tone: 'ok', text: 'Personal information saved.' });
    } catch (err) {
      setFlash({ tone: 'err', text: err instanceof Error ? err.message : 'Could not save your details.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-tide">Account</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Personal Information
        </h1>
        <p className="mt-1 text-sm text-ink-2">Update your profile picture and personal details.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-line bg-elevated p-6 text-center shadow-[0_1px_2px_rgba(22,34,46,0.04),0_20px_44px_-30px_rgba(22,34,46,0.3)] lg:self-start">
          {photo ? (
            <img
              src={photo}
              alt={profile?.name || 'Profile'}
              className="mx-auto h-28 w-28 rounded-full border-2 border-line object-cover shadow-lg"
            />
          ) : (
            <span className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-tide text-4xl font-semibold uppercase text-white shadow-lg">
              {initial}
            </span>
          )}
          <h2 className="mt-4 font-display text-lg font-semibold text-ink">{profile?.name || 'Traveller'}</h2>
          <p className="truncate text-xs text-ink-3">{profile?.email || ''}</p>
          {memberSince ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
              <BadgeCheck className="h-3 w-3" />
              Member since {memberSince}
            </p>
          ) : null}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoChange(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line-2 bg-elevated text-sm font-semibold text-ink transition-colors hover:border-tide hover:text-tide disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <p className="mt-2 text-[11px] text-ink-3">JPG, PNG or WebP · up to 10 MB</p>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-line bg-elevated p-6 shadow-[0_1px_2px_rgba(22,34,46,0.04),0_20px_44px_-30px_rgba(22,34,46,0.3)] sm:p-8"
        >
          <h2 className="font-display text-lg font-semibold text-ink">Contact details</h2>
          <p className="mt-0.5 text-xs text-ink-3">Your mobile number and email are verified account details.</p>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
            </Field>
            <div className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">Date of birth (optional)</span>
              <DatePicker
                value={dob}
                onChange={setDob}
                label="Date of birth"
                placeholder="Add date"
                maxDate={getTodayISO()}
              />
              <span className="block text-xs text-ink-3">Used for birthday offers. Clear it anytime.</span>
            </div>
            <Field label="Mobile number" hint="Your sign-in ID. Contact support to change it.">
              <Input type="tel" value={profile?.phone || ''} disabled readOnly aria-readonly="true" />
            </Field>
            <Field label="Email address" hint="Contact support to change your registered email.">
              <Input type="email" value={profile?.email || ''} disabled readOnly aria-readonly="true" />
            </Field>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {flash ? (
          <motion.div
            key="profile-flash"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: easeOut }}
            className="pointer-events-none fixed inset-x-0 top-20 z-palette flex justify-center px-4"
          >
            <div
              role="status"
              aria-live="polite"
              className={
                'pointer-events-auto flex items-center gap-2 rounded-xl border bg-elevated px-4 py-3 text-sm font-semibold shadow-2xl ' +
                (flash.tone === 'ok' ? 'border-ok/40 text-ok' : 'border-err/40 text-err')
              }
            >
              {flash.tone === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {flash.text}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
