import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { api, type Enclave } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Field, Textarea, Select } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/cn';
import type { Homestay } from '../types';

const BEACHES = [
  { id: 'kudle', label: 'Kudle Beach' },
  { id: 'om', label: 'Om Beach' },
  { id: 'halfMoon', label: 'Half Moon Beach' },
  { id: 'paradise', label: 'Paradise Beach' },
  { id: 'mainBeach', label: 'Main Beach' },
  { id: 'town', label: 'Gokarna Town' },
];

const AMENITY_POOL = [
  'Fast WiFi',
  'Kitchen',
  'Sunset View',
  'Beachfront',
  'Family Host',
  'Hot Water Geyser',
  'Solar Powered Lighting',
  'Free Parking',
  'Home-cooked Breakfast',
  'Air Conditioning',
  'Scooter Parking',
  'Campfire Pit',
];

const BADGE_POOL = ['Family Host', 'Beachfront', 'Sunset View', 'Cliff Edge', 'Off-Grid Eco', 'Budget Friendly'];

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
];

const CATEGORIES = ['room', 'environment', 'bathroom', 'parking', 'beach'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  room: 'Room photos',
  environment: 'Environment & view',
  bathroom: 'Bathroom',
  parking: 'Parking',
  beach: 'Beach & shoreline',
};

const empty = {
  title: '',
  subtitle: '',
  location: 'kudle',
  location_display: 'Kudle Beach',
  price_per_night: '',
  total_rooms: '2',
  availability_listed: '1',
  walking_minutes_to_beach: '5',
  host_name: '',
  host_whatsapp: '',
  description: '',
} as Record<string, string>;

export function AdminStayFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [form, setForm] = useState<Record<string, string>>({ ...empty });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<{ url: string; category: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [enclaves, setEnclaves] = useState<Enclave[]>([]);
  const [addingEnclave, setAddingEnclave] = useState(false);
  const [newEnclave, setNewEnclave] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getEnclaves()
      .then((list) => {
        if (list.length) setEnclaves(list);
      })
      .catch(() => {});
    if (!id) return;
    api
      .getAllStays()
      .then((stays) => {
        const s = stays.find((x) => x.id === id);
        if (s) {
          setForm({
            title: s.title,
            subtitle: s.subtitle,
            location: s.location,
            location_display: s.location_display,
            price_per_night: String(s.price_per_night),
            total_rooms: String(s.total_rooms),
            availability_listed: s.availability_listed ? '1' : '0',
            walking_minutes_to_beach: String(s.walking_minutes_to_beach),
            host_name: s.host_name,
            host_whatsapp: s.host_whatsapp,
            description: s.description,
          });
          setAmenities(s.amenities || []);
          setBadges(s.verifiedBadges || []);
          const categories = s.imageCategories || [];
          setUploaded((s.imageUrls || []).map((u, i) => ({ url: u, category: categories[i] || 'general' })));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggle(list: string[], setList: (l: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function addEnclave() {
    const label = newEnclave.trim();
    if (!label) return;
    try {
      const created = await api.createEnclave(label);
      setEnclaves((list) => [...list, created]);
      setForm((f) => ({ ...f, location: created.id, location_display: created.label }));
      setNewEnclave('');
      setAddingEnclave(false);
    } catch (err: any) {
      setError(err.message || 'Could not add the enclave.');
    }
  }

  async function handleFiles(category: string, files: FileList | null) {
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const { url } = await api.uploadPhoto(file);
        setUploaded((list) => [...list, { url, category }]);
      } catch (err) {
        console.error(err);
      }
    }
    setUploading(false);
  }

  function removePhoto(url: string) {
    setUploaded((list) => list.filter((x) => x.url !== url));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Give the stay a name.');
      return;
    }
    if (!form.host_name.trim() || form.host_whatsapp.replace(/\D/g, '').length < 10) {
      setError('Add the host name and a valid WhatsApp number.');
      return;
    }
    if (!form.price_per_night || Number(form.price_per_night) <= 0) {
      setError('Enter a nightly price.');
      return;
    }

    const payload: Partial<Homestay> & { images?: ({ url: string; category: string } | string)[]; badges?: string[] } = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || `${BEACHES.find((b) => b.id === form.location)?.label ?? 'Gokarna'} homestay`,
      location: form.location,
      location_display: BEACHES.find((b) => b.id === form.location)?.label ?? form.location_display,
      price_per_night: Number(form.price_per_night),
      total_rooms: Number(form.total_rooms) || 2,
      availability_listed: Number(form.availability_listed) ? 1 : 0,
      walking_minutes_to_beach: Number(form.walking_minutes_to_beach) || 5,
      host_name: form.host_name.trim(),
      host_whatsapp: form.host_whatsapp.trim(),
      description: form.description.trim() || 'A family-stewarded Karavali stay hosted with love.',
      amenities,
      images: uploaded.length ? uploaded : DEFAULT_IMAGES,
      badges,
    };

    setBusy(true);
    try {
      if (isEdit && id) {
        await api.updateStay(id, payload);
      } else {
        await api.createStay(payload);
      }
      navigate('/stays');
    } catch (err: any) {
      setError(err.message || 'Could not save the stay.');
    } finally {
      setBusy(false);
    }
  }

  async function removeStay() {
    if (!id) return;
    if (!window.confirm('Remove this stay from the network?')) return;
    try {
      await api.deleteStay(id);
      navigate('/stays');
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <div className="w-full space-y-8">
      <button
        onClick={() => navigate('/stays')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-ink-2 transition-colors hover:text-tide"
      >
        <Icon icon="lucide:arrow-left" className="h-4 w-4" />
        Back to all stays
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="overline">{isEdit ? 'Edit stay' : 'New registration'}</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink">
            {isEdit ? form.title : 'Register a homestay'}
          </h1>
          <p className="mt-2 text-sm text-ink-2">Listed instantly on the traveler site once saved.</p>
        </div>
        {isEdit ? (
          <Button variant="ghost" onClick={removeStay} className="gap-1.5 text-err hover:bg-err/10">
            <Icon icon="lucide:trash-2" className="h-4 w-4" />
            Remove stay
          </Button>
        ) : null}
      </div>

      <form onSubmit={submit} className="space-y-6 rounded-3xl border border-line bg-elevated p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Homestay name">
            <Input placeholder="e.g. Sunrise Cliff Cottage" value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Subtitle">
            <Input placeholder="e.g. Sea-facing rooms above the cove" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="overline block !text-ink-3">Enclave</label>
            <div className="flex gap-2">
              <Select value={form.location} onChange={(e) => set('location', e.target.value)} className="flex-1">
                {(enclaves.length ? enclaves : BEACHES).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setAddingEnclave((v) => !v)}
                className="shrink-0 rounded-xl border border-line-2 px-3 text-xs font-semibold text-ink-2 transition-colors hover:border-tide hover:text-tide"
              >
                + Add
              </button>
            </div>
            {addingEnclave ? (
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="New enclave, e.g. Belekan Beach"
                  value={newEnclave}
                  onChange={(e) => setNewEnclave(e.target.value)}
                />
                <Button type="button" size="sm" onClick={addEnclave}>
                  Add enclave
                </Button>
              </div>
            ) : null}
          </div>
          <Field label="Price per night (₹)">
            <Input type="number" placeholder="1800" value={form.price_per_night} onChange={(e) => set('price_per_night', e.target.value)} />
          </Field>
          <Field label="Rooms">
            <Input type="number" min={1} max={50} value={form.total_rooms} onChange={(e) => set('total_rooms', e.target.value)} />
          </Field>
          <Field label="Publish availability">
            <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line-2 bg-elevated px-4 text-sm text-ink transition-colors hover:border-tide">
              <input
                type="checkbox"
                checked={form.availability_listed === '1'}
                onChange={(e) => set('availability_listed', e.target.checked ? '1' : '0')}
                className="h-4 w-4 accent-tide"
              />
              <span className="text-xs font-semibold">
                {form.availability_listed === '1' ? 'Visible & bookable' : 'Hidden from travelers'}
              </span>
            </label>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Walk to beach (min)">
            <Input
              type="number"
              min={0}
              value={form.walking_minutes_to_beach}
              onChange={(e) => set('walking_minutes_to_beach', e.target.value)}
            />
          </Field>
          <Field label="Host name">
            <Input placeholder="e.g. Manjunath Hegde" value={form.host_name} onChange={(e) => set('host_name', e.target.value)} />
          </Field>
          <Field label="Host WhatsApp">
            <Input type="tel" placeholder="+91 …" value={form.host_whatsapp} onChange={(e) => set('host_whatsapp', e.target.value)} />
          </Field>
        </div>

        <Field label="Description">
          <Textarea
            placeholder="Describe the space, the view, and what makes it special…"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CATEGORIES.filter((c) => c !== 'beach' || form.location !== 'town').map((c) => (
              <div key={c} className="space-y-2 rounded-2xl border border-line bg-paper-2 p-3">
                <p className="overline">{CATEGORY_LABELS[c]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {uploaded
                    .filter((i) => i.category === c)
                    .map((img) => (
                      <div key={img.url} className="relative h-16 w-20 overflow-hidden rounded-lg border border-line">
                        <img src={img.url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(img.url)}
                          aria-label="Remove photo"
                          className="absolute right-0.5 top-0.5 rounded-full bg-ink/60 p-0.5 text-white transition-colors hover:bg-err"
                        >
                          <Icon icon="lucide:x" className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  <label className="flex h-16 w-20 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-line-2 text-ink-3 transition-colors hover:border-tide hover:text-tide">
                    <Icon icon="lucide:upload" className="h-3.5 w-3.5" />
                    <span className="font-mono text-[8px] uppercase tracking-wider">{uploading ? 'Uploading' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleFiles(c, e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-ink-3">Leave every category empty to use the default coastal photo set.</p>
        </div>

        <div className="space-y-2">
          <p className="overline">Amenities</p>
          <div className="flex flex-wrap gap-2">
            {AMENITY_POOL.map((a) => {
              const active = amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggle(amenities, setAmenities, a)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all',
                    active ? 'border-tide bg-tide text-white' : 'border-line-2 bg-paper-2 text-ink-2 hover:border-tide hover:text-ink',
                  )}
                >
                  {active ? <Icon icon="lucide:check" className="h-3 w-3" /> : null}
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="overline">Badges</p>
          <div className="flex flex-wrap gap-2">
            {BADGE_POOL.map((b) => {
              const active = badges.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggle(badges, setBadges, b)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all',
                    active ? 'border-gold bg-gold/20 text-ink' : 'border-line-2 bg-paper-2 text-ink-2 hover:border-tide hover:text-ink',
                  )}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>

        {error ? <p className="text-xs font-semibold text-err">{error}</p> : null}

        <Button type="submit" disabled={busy} className="w-full gap-2 py-3.5">
          <Icon icon="lucide:plus" className="h-4 w-4" />
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Register homestay'}
        </Button>
      </form>
    </div>
  );
}
