import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import { api, type Enclave } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Field, Textarea, Select } from '../components/ui/Input';
import { cn } from '../lib/cn';
import type { Owner } from '../types';

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

export function AddStayPage({ owner }: { owner: Owner }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [beach, setBeach] = useState('kudle');
  const [price, setPrice] = useState('');
  const [rooms, setRooms] = useState('2');
  const [walk, setWalk] = useState('5');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState<string[]>(['Fast WiFi']);
  const [enclaves, setEnclaves] = useState<Enclave[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getEnclaves()
      .then((list) => {
        if (list.length) setEnclaves(list);
      })
      .catch(() => {});
  }, []);

  function toggleAmenity(a: string) {
    setAmenities((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Give your homestay a name.');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Enter a nightly price.');
      return;
    }

    setBusy(true);
    try {
      await api.createStay({
        title: title.trim(),
        subtitle: `${BEACHES.find((b) => b.id === beach)?.label ?? 'Gokarna'} homestay`,
        location: beach,
        location_display: BEACHES.find((b) => b.id === beach)?.label ?? 'Gokarna',
        price_per_night: Number(price),
        total_rooms: Number(rooms) || 2,
        walking_minutes_to_beach: Number(walk) || 5,
        host_name: owner.name,
        host_whatsapp: owner.phone,
        description: description.trim() || 'A family-stewarded Karavali stay hosted with love.',
        images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'],
        amenities,
        badges: ['Family Host'],
      });
      navigate('/stays');
    } catch (err: any) {
      setError(err.message || 'Could not create the stay.');
    } finally {
      setBusy(false);
    }
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
        <p className="overline">New listing</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink">Add a stay</h1>
        <p className="mt-2 text-sm text-ink-2">Listed under {owner.name} — live on the traveler site the moment you save.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-line bg-elevated p-6">
        <Field label="Homestay name">
          <Input placeholder="e.g. Sunrise Cliff Cottage" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Enclave">
            <Select value={beach} onChange={(e) => setBeach(e.target.value)}>
              {(enclaves.length ? enclaves : BEACHES).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Price per night (₹)">
            <Input type="number" placeholder="1800" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Rooms">
            <Input type="number" min={1} max={20} value={rooms} onChange={(e) => setRooms(e.target.value)} />
          </Field>
          <Field label="Walk to beach (min)">
            <Input type="number" min={0} value={walk} onChange={(e) => setWalk(e.target.value)} />
          </Field>
        </div>

        <Field label="Description">
          <Textarea
            placeholder="Describe the space, the view, and what makes it special…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div className="space-y-2">
          <p className="overline">Amenities</p>
          <div className="flex flex-wrap gap-2">
            {AMENITY_POOL.map((a) => {
              const active = amenities.includes(a);
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

        {error ? <p className="text-xs font-semibold text-err">{error}</p> : null}

        <Button type="submit" disabled={busy} className="w-full gap-2 py-3.5">
          <Plus className="h-4 w-4" />
          {busy ? 'Listing your stay…' : 'List my stay'}
        </Button>
      </form>
    </div>
  );
}
