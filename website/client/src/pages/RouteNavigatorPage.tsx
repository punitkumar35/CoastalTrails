import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  Bus,
  Camera,
  ChevronRight,
  Clock,
  CloudSun,
  Compass,
  Download,
  Droplets,
  IndianRupee,
  Info,
  LocateFixed,
  Maximize,
  Mountain,
  Navigation,
  Phone,
  Route,
  Search,
  Share2,
  Ship,
  Sun,
  Sunset,
  TrendingUp,
  User,
  Waves,
} from 'lucide-react';
import { CoastalMapView } from '../components/CoastalMapView';
import { cn } from '../lib/cn';

type Segment = 'trek' | 'ferry' | 'road';

interface TransportOption {
  id: string;
  label: string;
  icon: typeof Ship;
  duration: string;
  cost: string;
  schedule: string;
  status: 'live' | 'waiting' | 'booked';
  terrain: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  segment: Segment[];
}

interface Waypoint {
  id: string;
  name: string;
  km: number;
  elevation: number;
  crowd: 'Low' | 'Moderate' | 'High';
  note: string;
  type: 'beach' | 'steps' | 'headland' | 'viewpoint' | 'end';
  x: number;
  y: number;
}

const TRANSPORT_OPTIONS: TransportOption[] = [
  {
    id: 'trek',
    label: 'Cliff Trekking',
    icon: Mountain,
    duration: '48 min',
    cost: 'Free',
    schedule: 'Open daylight hours',
    status: 'live',
    terrain: 'Granite clifftop path · loose scree in places',
    difficulty: 'Moderate',
    segment: ['trek'],
  },
  {
    id: 'ferry',
    label: 'Boat Ferry',
    icon: Ship,
    duration: '22 min',
    cost: '₹120',
    schedule: 'Running every 20 min',
    status: 'live',
    terrain: 'Calm sea lanes · life jackets provided',
    difficulty: 'Easy',
    segment: ['ferry'],
  },
  {
    id: 'scooter',
    label: 'Coastal Scooter',
    icon: Bike,
    duration: '34 min',
    cost: '₹80',
    schedule: '24/7 · self ride',
    status: 'live',
    terrain: 'Paved coastal road through village',
    difficulty: 'Easy',
    segment: ['trek', 'road'],
  },
  {
    id: 'auto',
    label: 'Auto Rickshaw',
    icon: Bus,
    duration: '18 min',
    cost: '₹150',
    schedule: 'Dispatch under 10 min',
    status: 'waiting',
    terrain: 'Direct drop at Om Beach entry gate',
    difficulty: 'Easy',
    segment: ['road'],
  },
];

const WAYPOINTS: Waypoint[] = [
  {
    id: 'kudle',
    name: 'Kudle Beach',
    km: 0,
    elevation: 6,
    crowd: 'Moderate',
    note: 'Entry free · swim between the red flags · last food stop before the headland.',
    type: 'beach',
    x: 12,
    y: 68,
  },
  {
    id: 'steps',
    name: 'Clifftop Steps',
    km: 1.1,
    elevation: 34,
    crowd: 'Low',
    note: '110 hand-cut steps · single file · guard rail is missing after rain.',
    type: 'steps',
    x: 34,
    y: 44,
  },
  {
    id: 'headland',
    name: 'Middle Beach Headland',
    km: 1.9,
    elevation: 48,
    crowd: 'Low',
    note: 'Sheer 40m drop on the seaward side — stay 2m back from the edge.',
    type: 'headland',
    x: 56,
    y: 30,
  },
  {
    id: 'sunset',
    name: 'Sunset Viewpoint',
    km: 2.4,
    elevation: 31,
    crowd: 'High',
    note: 'Best golden-hour photos 17:50–18:30 · tripod spot on the flat rock.',
    type: 'viewpoint',
    x: 76,
    y: 42,
  },
  {
    id: 'om',
    name: 'Om Beach',
    km: 2.8,
    elevation: 4,
    crowd: 'High',
    note: 'Ferry jetty on the south end · autos queue at the gate · water refill kiosk.',
    type: 'end',
    x: 92,
    y: 64,
  },
];

const ELEVATION = [6, 12, 22, 34, 42, 48, 44, 31, 22, 12, 6, 4];

function ElevationProfile() {
  const w = 620;
  const h = 110;
  const max = Math.max(...ELEVATION);
  const pts = ELEVATION.map((e, i) => {
    const x = (i / (ELEVATION.length - 1)) * w;
    const y = h - 12 - (e / max) * (h - 30);
    return { x, y, e };
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none" aria-label="Elevation profile">
      <defs>
        <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0D9488" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0D9488" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#elevGrad)" />
      <path d={line} fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={i === 3 || i === 5 ? 4 : 2.5} fill={i === 3 || i === 5 ? '#F59E0B' : '#fff'} stroke="#0D9488" strokeWidth="1.5" />
          {(i === 3 || i === 5) && (
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0F172A">
              {p.e}m
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'trek', label: 'Trail & Trek' },
  { id: 'ferry', label: 'Ferry Routes' },
  { id: 'road', label: 'Auto & Scooter' },
];

const CROWD_STYLE: Record<Waypoint['crowd'], string> = {
  Low: 'bg-emerald-500',
  Moderate: 'bg-amber-500',
  High: 'bg-rose-500',
};

export const RouteNavigatorPage: React.FC = () => {
  const [segment, setSegment] = useState<Segment>('trek');
  const [selected, setSelected] = useState<TransportOption>(TRANSPORT_OPTIONS[0]);
  const [gpxOn, setGpxOn] = useState(false);
  const [layer, setLayer] = useState<'Satellite' | 'Hybrid' | 'Topo 3D'>('Satellite');
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [hoverPin, setHoverPin] = useState<Waypoint | null>(null);

  const options = useMemo(() => TRANSPORT_OPTIONS.filter((o) => o.segment.includes(segment)), [segment]);

  const activeOption = options.some((o) => o.id === selected.id) ? selected : options[0];

  return (
    <div className="w-full max-w-full">
      {/* Compact top bar */}
      <div className="mb-4 flex h-14 items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-3 shadow-sm sm:px-4">
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0D9488] text-white">
            <Waves className="h-4 w-4" />
          </span>
          <span className="hidden text-sm font-bold tracking-tight text-[#0F172A] md:block">CoastalTrails</span>
        </div>
        <div className="hidden items-center gap-1 text-xs font-medium text-slate-500 lg:flex">
          <span>Gokarna</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="font-semibold text-[#0F172A]">Kudle to Om Beach</span>
        </div>

        <div className="mx-auto flex items-center gap-0.5 rounded-full border border-[#E2E8F0] bg-slate-50 p-0.5">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSegment(s.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]',
                segment === s.id ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-600 hover:text-[#0F172A]',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-[#E2E8F0] bg-slate-50 px-2.5 py-1.5 sm:flex">
            <CloudSun className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-xs font-bold text-[#0F172A]">28°C</span>
            <span className="h-3 w-px bg-[#E2E8F0]" />
            <Droplets className="h-3.5 w-3.5 text-[#0D9488]" />
            <span className="text-[11px] font-semibold text-slate-600">High tide 14:20</span>
          </div>
          <button
            type="button"
            aria-label="Search routes"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-slate-500 transition-colors hover:text-[#0D9488] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Profile"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F172A] text-white transition-transform hover:scale-105"
          >
            <User className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Split viewport */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Left: route & dispatch controller */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0D9488]/10 px-2.5 py-1 text-[11px] font-bold text-[#0D9488]">
                    <Route className="h-3 w-3" />
                    Coastal Trail
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    Moderate · 2.8 km
                  </span>
                </div>
                <h1 className="mt-2.5 font-sans text-xl font-bold tracking-tight text-[#0F172A]">
                  Kudle Beach → Om Beach
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-[#F59E0B]" />
                    +42 m elevation
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#0D9488]" />
                    Trek 48 min
                  </span>
                  <span className="flex items-center gap-1">
                    <Ship className="h-3.5 w-3.5 text-[#0D9488]" />
                    Boat 22 min
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F172A]">Transport options</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Verified fixed rates</span>
            </div>

            <div className="mt-3 space-y-2">
              {options.map((o) => {
                const isActive = activeOption.id === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelected(o)}
                    className={cn(
                      'w-full rounded-xl border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]',
                      isActive
                        ? 'border-[#0D9488] bg-[#0D9488]/5 shadow-sm'
                        : 'border-[#E2E8F0] bg-white hover:border-[#0D9488]/40 hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                          isActive ? 'bg-[#0D9488] text-white' : 'bg-slate-100 text-[#0F172A]',
                        )}
                      >
                        <o.icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-[#0F172A]">{o.label}</span>
                          <span className="shrink-0 font-mono text-sm font-bold text-[#0D9488]">{o.cost}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] text-slate-500">{o.terrain}</span>
                          <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-600">{o.duration}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                o.status === 'live' ? 'animate-pulse bg-emerald-500' : o.status === 'waiting' ? 'bg-amber-500' : 'bg-rose-500',
                              )}
                            />
                            {o.schedule}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">{o.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action footer */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setShowDriverModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F172A] py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#0D9488] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] active:scale-[0.98]"
            >
              <Phone className="h-4 w-4" />
              {activeOption.id === 'ferry' ? 'Book Ferry · Verified Dispatch' : 'Contact Verified Dispatch'}
            </button>
            <button
              type="button"
              onClick={() => setGpxOn((v) => !v)}
              className={cn(
                'mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]',
                gpxOn ? 'border-[#0D9488] bg-[#0D9488]/10 text-[#0D9488]' : 'border-[#E2E8F0] text-slate-600 hover:border-[#0D9488]/40',
              )}
            >
              <Download className="h-3.5 w-3.5" />
              {gpxOn ? 'Offline GPX ready — saved for this route' : 'Download Offline GPX / Map'}
            </button>
          </div>
        </div>

        {/* Right: map canvas */}
        <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] shadow-sm">
          <CoastalMapView
            showTrailOverlay
            initialTrackingMode={segment === 'ferry' ? 'ferry' : 'trekker'}
            enablePinDrop={false}
            height="calc(100vh - 180px)"
          />

          {/* Layer switcher */}
          <div className="absolute left-3 top-3 flex items-center gap-0.5 rounded-full border border-[#E2E8F0] bg-white/95 p-0.5 shadow-md backdrop-blur">
            {(['Satellite', 'Hybrid', 'Topo 3D'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLayer(l)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-bold transition-all',
                  layer === l ? 'bg-[#0D9488] text-white' : 'text-slate-600 hover:text-[#0F172A]',
                )}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Map controls */}
          <div className="absolute right-3 top-3 flex flex-col gap-1.5">
            {[
              { icon: LocateFixed, label: 'Recenter GPS' },
              { icon: Compass, label: 'Compass orientation' },
              { icon: Maximize, label: 'Fullscreen' },
              { icon: Share2, label: 'Share trail' },
            ].map((c) => (
              <button
                key={c.label}
                type="button"
                aria-label={c.label}
                title={c.label}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white/95 text-slate-600 shadow-sm backdrop-blur transition-colors hover:text-[#0D9488] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
              >
                <c.icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {/* POI pins */}
          {WAYPOINTS.map((w) => (
            <div key={w.id} className="absolute" style={{ left: `${w.x}%`, top: `${w.y}%` }}>
              <button
                type="button"
                onMouseEnter={() => setHoverPin(w)}
                onMouseLeave={() => setHoverPin((p) => (p?.id === w.id ? null : p))}
                onClick={() => setHoverPin((p) => (p?.id === w.id ? null : w))}
                className={cn(
                  'group relative flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]',
                  w.type === 'headland' || w.type === 'steps' ? 'bg-rose-500' : w.type === 'viewpoint' ? 'bg-[#F59E0B]' : 'bg-[#0D9488]',
                )}
              >
                {w.type === 'headland' || w.type === 'steps' ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-white" />
                ) : w.type === 'viewpoint' ? (
                  <Camera className="h-3.5 w-3.5 text-white" />
                ) : w.type === 'end' ? (
                  <Sunset className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Waves className="h-3.5 w-3.5 text-white" />
                )}
              </button>

              {hoverPin?.id === w.id && (
                <div className="absolute bottom-7 left-1/2 z-10 w-52 -translate-x-1/2 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-lg">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0F172A]">{w.name}</span>
                    <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-white', CROWD_STYLE[w.crowd])}>
                      {w.crowd}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{w.note}</p>
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] font-semibold text-slate-400">
                    <span>{w.km.toFixed(1)} km</span>
                    <span>{w.elevation} m</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Bottom overlay: elevation + route timeline */}
          <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-[#E2E8F0] bg-white/95 p-3.5 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <TrendingUp className="h-3 w-3 text-[#0D9488]" />
                Elevation profile
              </span>
              <span className="font-mono text-[10px] font-semibold text-slate-400">+42 m total</span>
            </div>
            <div className="mt-1 h-16 w-full">
              <ElevationProfile />
            </div>

            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
              {WAYPOINTS.map((w, i) => (
                <div key={w.id} className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onMouseEnter={() => setHoverPin(w)}
                    onMouseLeave={() => setHoverPin(null)}
                    className="group flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-slate-50 py-1.5 pl-1.5 pr-3 transition-all hover:border-[#0D9488] hover:bg-[#0D9488]/5"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F172A] font-mono text-[9px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-[10px] font-bold text-[#0F172A]">{w.name}</span>
                    <span className="flex items-center gap-0.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full', CROWD_STYLE[w.crowd])} />
                      <span className="font-mono text-[9px] font-semibold text-slate-400">{w.elevation}m</span>
                    </span>
                  </button>
                  {i < WAYPOINTS.length - 1 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch modal */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0F172A]">Regulated Gokarna Dispatch</h3>
              <button
                type="button"
                onClick={() => setShowDriverModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0F172A]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              {activeOption.id === 'ferry'
                ? 'Ferries leave every 20 minutes from the Kudle jetty. Pay cash or UPI on board.'
                : 'Standard fares are regulated by local transport syndicates. Pay directly to the driver in cash or UPI.'}
            </p>

            <div className="space-y-2.5">
              {[
                { name: 'Manjunath Gowda', role: activeOption.id === 'ferry' ? 'Ferry Jetty · Kudle' : 'Auto Stand #04 · Om Beach Route', phone: '+919845012345' },
                { name: 'Narayana Naik', role: activeOption.id === 'ferry' ? 'Backup Boat · North Jetty' : 'Kudle Clifftop Taxi Association', phone: '+919845067890' },
              ].map((d) => (
                <div key={d.phone} className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-slate-50 p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D9488] text-white">
                      <User className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">{d.name}</p>
                      <p className="text-[10px] text-slate-500">{d.role}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${d.phone}`}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#0D9488]"
                  >
                    <Phone className="h-3 w-3" />
                    Call
                  </a>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-[#0D9488]/10 p-3 text-[11px] text-[#0D9488]">
              <Info className="h-4 w-4 shrink-0" />
              Fair pricing monitored by Gokarna Panchayat &amp; Police Station.
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDriverModal(false)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setShowDriverModal(false)}
                className="flex-1 rounded-xl bg-[#0D9488] py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0b7c74]"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {activeOption.cost} {activeOption.id === 'trek' ? '' : '· Pay on board'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
