import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Save } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Field, Textarea } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/cn';
import type { Homestay, Owner } from '../types';

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

export function StayEditorPage({ owner }: { owner: Owner }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stay, setStay] = useState<Homestay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getOwnerStays(owner.phone)
      .then((stays) => {
        const match = stays.find((s) => s.id === id);
        if (match) setStay(match);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id, owner.phone]);

  function patch(fields: Partial<Homestay>) {
    setStay((s) => (s ? { ...s, ...fields } : s));
  }

  function toggleAmenity(a: string) {
    if (!stay) return;
    const has = stay.amenities.includes(a);
    patch({ amenities: has ? stay.amenities.filter((x) => x !== a) : [...stay.amenities, a] });
  }

  async function save() {
    if (!stay) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.updateStay(stay.id, {
        title: stay.title,
        subtitle: stay.subtitle,
        location_display: stay.location_display,
        price_per_night: stay.price_per_night,
        total_rooms: stay.total_rooms,
        walking_minutes_to_beach: stay.walking_minutes_to_beach,
        description: stay.description,
        amenities: stay.amenities,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (!stay) {
    return <p className="text-sm text-ink-2">Stay not found under your account.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <button
        onClick={() => navigate('/stays')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-ink-2 transition-colors hover:text-tide"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my stays
      </button>

      <div>
        <p className="overline">Stay editor</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink">{stay.title}</h1>
      </div>

      <div className="space-y-4 rounded-3xl border border-line bg-elevated p-6">
        <Field label="Title">
          <Input value={stay.title} onChange={(e) => patch({ title: e.target.value })} />
        </Field>
        <Field label="Subtitle">
          <Input value={stay.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Price per night (₹)">
            <Input
              type="number"
              value={stay.price_per_night}
              onChange={(e) => patch({ price_per_night: Number(e.target.value) })}
            />
          </Field>
          <Field label="Rooms">
            <Input type="number" value={stay.total_rooms} onChange={(e) => patch({ total_rooms: Number(e.target.value) })} />
          </Field>
          <Field label="Walk to beach (min)">
            <Input
              type="number"
              value={stay.walking_minutes_to_beach}
              onChange={(e) => patch({ walking_minutes_to_beach: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Location display">
          <Input value={stay.location_display} onChange={(e) => patch({ location_display: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea value={stay.description} onChange={(e) => patch({ description: e.target.value })} />
        </Field>
      </div>

      <div className="rounded-3xl border border-line bg-elevated p-6">
        <p className="overline mb-4">Amenities</p>
        <div className="flex flex-wrap gap-2">
          {AMENITY_POOL.map((a) => {
            const active = stay.amenities.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={cn(
                  'flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all',
                  active ? 'border-tide bg-tide text-white' : 'border-line-2 bg-paper-2 text-ink-2 hover:border-tide hover:text-ink',
                )}
              >
                {active ? <Check className="h-3 w-3" /> : null}
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        {saved ? <span className="text-xs font-semibold text-ok">Saved ✓</span> : null}
      </div>
    </div>
  );
}
