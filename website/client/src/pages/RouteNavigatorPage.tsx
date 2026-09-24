import React, { useState } from 'react';
import { ArrowRight, Check, Clock, Compass, Gem, Landmark, Mail, Waves } from 'lucide-react';
import { cn } from '../lib/cn';

type Category = 'beach' | 'culture' | 'gem' | 'activity';
type Filter = 'all' | Category;

interface Article {
  id: string;
  category: Category;
  title: string;
  excerpt: string;
  image: string;
  author: string;
  date: string;
  readMins: number;
}

interface BeachFact {
  name: string;
  vibe: string;
  access: string;
  swim: string;
  crowd: 'Calm' | 'Busy' | 'Wild';
}

const CATEGORY_META: Record<Category, { label: string; icon: typeof Waves; text: string }> = {
  beach: { label: 'Beaches', icon: Waves, text: 'text-tide' },
  culture: { label: 'Culture & History', icon: Landmark, text: 'text-ember' },
  gem: { label: 'Hidden Gems', icon: Gem, text: 'text-gold' },
  activity: { label: 'Activities', icon: Compass, text: 'text-ok' },
};

const ARTICLES: Article[] = [
  {
    id: 'atmalinga',
    category: 'culture',
    title: 'The Atmalinga That Refused to Move',
    excerpt:
      'A 4th-century CE Dravidian temple facing the Arabian Sea, deifying the Pranalinga — the Atmalinga Ravana carried south and Ganesha tricked him into setting down. One of the 275 paadal petra sthalams sung in the Tevaram.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Main_entry_to_the_Mahabaleshwar_Temple_at_Gokaran.jpg',
    author: 'Devika Nayak',
    date: '16 Feb 2026',
    readMins: 8,
  },
  {
    id: 'town-history',
    category: 'culture',
    title: 'A Cow\u2019s Ear, a Thousand Years',
    excerpt:
      'Gokarna — literally "the cow\u2019s ear" — is mentioned in the Mahabharata and by Kalidasa in his 4th-century Raghuvamsha as the "Lord of Gokarna". A temple town of the Uttara Kannada coast that never stopped being both.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Delight_india.jpg',
    author: 'Devika Nayak',
    date: '5 Apr 2026',
    readMins: 9,
  },
  {
    id: 'ganapati',
    category: 'culture',
    title: 'How Ganesha Outwitted Ravana',
    excerpt:
      'Before the Atmalinga, pilgrims climb to Maha Ganapati Temple — the hilltop shrine of the guardian whose quick thinking kept the sacred linga in Gokarna.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Entrance_to_Gokarna_Mahabaleshwar_Temple_-_panoramio.jpg',
    author: 'Devika Nayak',
    date: '2 Mar 2026',
    readMins: 4,
  },
  {
    id: 'kotiteertha',
    category: 'culture',
    title: 'A Thousand Springs: Kotiteertha',
    excerpt:
      'The sacred tank where pilgrims bathe before temple darshan — a crore of tirthas, one quiet square of water in the middle of the temple town.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/63/India_Karnataka_Gokarna_Kotiteertha_%281481547363%29.jpg',
    author: 'Meera Kamat',
    date: '18 Mar 2026',
    readMins: 5,
  },
  {
    id: 'shivaratri',
    category: 'culture',
    title: 'Shivaratri: The Chariot That Walks',
    excerpt:
      'Once a year the Mahabaleshwara rath rolls down Car Street — conch, fire and a town that stays awake till the great chariot of Shiva comes home.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Gokarna_Temple.jpg',
    author: 'Meera Kamat',
    date: '20 Feb 2026',
    readMins: 6,
  },
  {
    id: 'cuisine',
    category: 'culture',
    title: 'Karavali on a Plate',
    excerpt:
      'Jolada rotti and payasa in the temple lanes; pomfret rava-fry and solkadi in the shacks — a beginner\u2019s field guide to eating the Konkani coast.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/81/Vegetarian_thali_Karnataka_DSC0004.jpg',
    author: 'Aarav Bhat',
    date: '11 Jan 2026',
    readMins: 7,
  },
  {
    id: 'main-beach',
    category: 'beach',
    title: 'Main Beach: The Pilgrim Shore',
    excerpt:
      'Where the town meets the water — pilgrims take a ritual dip before the temple while surf schools set up along the wave-friendly shoreline. Currents run strong; swim with care.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Gokarna_temple_beach.JPG',
    author: 'Devika Nayak',
    date: '3 Jan 2026',
    readMins: 5,
  },
  {
    id: 'kudle',
    category: 'beach',
    title: 'Kudle Beach: The Sunset Specialist',
    excerpt:
      'A wide golden crescent backed by palms — morning yoga, hammocks, sunset drum circles and the shack culture that makes travellers stay for weeks. 20 minutes on foot from town, or a short auto ride.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Kudle_Beach%2C_Gokarna.jpg',
    author: 'Aarav Bhat',
    date: '12 Jan 2026',
    readMins: 6,
  },
  {
    id: 'om',
    category: 'beach',
    title: 'Om Beach: Two Crescent Moons',
    excerpt:
      'Two crescents of sand that trace the \u0950 symbol from above. The most set-up beach on the circuit — jet skis (\u20b9500), banana boats (\u20b9300), parasailing (\u20b91,500) and the best phone signal on the coast.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/PXL_20260103_101009613_People_and_Beach_Om_Beach_Gokarna%2C_Karnataka_43.jpg/1280px-PXL_20260103_101009613_People_and_Beach_Om_Beach_Gokarna%2C_Karnataka_43.jpg',
    author: 'Meera Kamat',
    date: '28 Jan 2026',
    readMins: 5,
  },
  {
    id: 'halfmoon',
    category: 'beach',
    title: 'Half Moon Beach: The Quiet Crescent',
    excerpt:
      'A small secluded crescent with no permanent shops and little signal — reached by a 20\u201345 minute cliff walk from Om or a \u20b9150\u2013300 boat ride. Calm water, clean sand, a handful of people on a busy day.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/PXL_20260103_091848995.MP_Half_Moon_Beach_Gokarna_Karnatak_01.jpg/1280px-PXL_20260103_091848995.MP_Half_Moon_Beach_Gokarna_Karnatak_01.jpg',
    author: 'Aarav Bhat',
    date: '9 Feb 2026',
    readMins: 7,
  },
  {
    id: 'paradise',
    category: 'beach',
    title: 'Paradise Beach: The Wild South',
    excerpt:
      'Also called Full Moon Beach — no road, no signal, tent camps from October to March, and on certain nights the water glows. Reach it by a 30-minute boulder trek from Half Moon or a \u20b9300 boat from Om.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PXL_20260103_054657562.MP_Paradise_beach_gokarna_Paradise_Beach_Trail%2C_Gokarna%2C_Karnataka_581326_05.jpg/1280px-PXL_20260103_054657562.MP_Paradise_beach_gokarna_Paradise_Beach_Trail%2C_Gokarna%2C_Karnataka_581326_05.jpg',
    author: 'Rohan Pai',
    date: '14 Mar 2026',
    readMins: 6,
  },
  {
    id: 'nirvana',
    category: 'beach',
    title: 'Nirvana Beach: The Tiny Secret Cove',
    excerpt:
      'Tucked beyond Paradise, one of Gokarna\u2019s best-kept secrets — reachable only by an extended trek or by boat. Isolated swimming, meditation and sunsets with no one around.',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/PXL_20260103_054657562.MP_Paradise_beach_gokarna_Paradise_Beach_Trail%2C_Gokarna%2C_Karnataka_581326_15.jpg/1280px-PXL_20260103_054657562.MP_Paradise_beach_gokarna_Paradise_Beach_Trail%2C_Gokarna%2C_Karnataka_581326_15.jpg',
    author: 'Rohan Pai',
    date: '25 Apr 2026',
    readMins: 4,
  },
  {
    id: 'belekan',
    category: 'beach',
    title: 'Belekan Beach: The Quiet North End',
    excerpt:
      'A quiet, uncrowded beach about 5 km north of town via a scenic coastal road — birdwatching, peaceful walks and undisturbed sunbathing far from the trek crowd.',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/PXL_20260103_101009613_People_and_Beach_Om_Beach_Gokarna%2C_Karnataka_35.jpg/1280px-PXL_20260103_101009613_People_and_Beach_Om_Beach_Gokarna%2C_Karnataka_35.jpg',
    author: 'Aarav Bhat',
    date: '30 Apr 2026',
    readMins: 5,
  },
  {
    id: 'mirjan-fort',
    category: 'gem',
    title: 'Mirjan Fort: The Pepper Queen\u2019s Castle',
    excerpt:
      'A 16th-century laterite fort built by Rani Chennabhairadevi, hidden in the areca groves just 21 km from Gokarna off NH 66 — moats, ramparts and almost no visitors.',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/MIRJAN_FORT_06.jpg/1280px-MIRJAN_FORT_06.jpg',
    author: 'Devika Nayak',
    date: '8 Apr 2026',
    readMins: 6,
  },
  {
    id: 'yana-caves',
    category: 'gem',
    title: 'Yana: The Black Limestone Towers',
    excerpt:
      'The karst outcrops of Bhairaveshwara Shikhara and Mohini Shikhara rise out of the Western Ghats jungle — declared a National Geological Monument by the Geological Survey of India in 2026.',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Yana_Rocks_Karnataka_India.jpg/1280px-Yana_Rocks_Karnataka_India.jpg',
    author: 'Rohan Pai',
    date: '19 Mar 2026',
    readMins: 7,
  },
  {
    id: 'vibhooti-falls',
    category: 'gem',
    title: 'Vibhooti Falls: A Monsoon Secret',
    excerpt:
      'A forest trail near Yana ends at a cold, limestone-blue pool below the falls — the locals\u2019 favourite swim between June and October, when the Western Ghats are loud with water.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Chandika_River_at_Yana.jpg',
    author: 'Meera Kamat',
    date: '22 Jul 2026',
    readMins: 5,
  },
  {
    id: 'cliff-caves',
    category: 'gem',
    title: 'The Sea Caves Below Kudle',
    excerpt:
      'At low tide, the headland between Kudle and Om opens small granite sea caves — go with a local, go at low tide, and go before noon while the light still reaches in.',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/PXL_20260103_091848995.MP_Half_Moon_Beach_Gokarna_Karnatak_07.jpg/1280px-PXL_20260103_091848995.MP_Half_Moon_Beach_Gokarna_Karnatak_07.jpg',
    author: 'Aarav Bhat',
    date: '13 Feb 2026',
    readMins: 5,
  },
  {
    id: 'kayak',
    category: 'activity',
    title: 'Kayaking the Aghanashini Mangroves',
    excerpt:
      'The Aghanashini is one of India\u2019s last major undammed rivers. Trips run from Tadri Harbour through its mangrove backwaters — certified life jackets, beginner-friendly, calmest at dawn and late afternoon.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/River_Aghanashini.jpg',
    author: 'Rohan Pai',
    date: '24 Feb 2026',
    readMins: 6,
  },
  {
    id: 'trek',
    category: 'activity',
    title: 'The Gokarna Beach Trek, Step by Step',
    excerpt:
      'Main \u2192 Kudle \u2192 Om \u2192 Half Moon \u2192 Paradise: roughly 6\u20138 km and 3\u20136 hours of clifftops, forest and coves. Easy-to-moderate, best October\u2013March, start by 8 AM, carry 2 litres of water.',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/PXL_20260103_054657562.MP_Paradise_beach_gokarna_Paradise_Beach_Trail%2C_Gokarna%2C_Karnataka_581326_01.jpg/1280px-PXL_20260103_054657562.MP_Paradise_beach_gokarna_Paradise_Beach_Trail%2C_Gokarna%2C_Karnataka_581326_01.jpg',
    author: 'Rohan Pai',
    date: '8 Mar 2026',
    readMins: 9,
  },
  {
    id: 'dolphin',
    category: 'activity',
    title: 'Dolphin Light at Sunset',
    excerpt:
      'Indo-Pacific humpback dolphins feed where the Aghanashini meets the sea near Tadri Harbour — early 8 AM or sunset rides give the best sightings, with operators claiming 90% odds in season.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Gray%27s_spinner_dolphin_%28Stenella_longirostris_longirostris%29_Panglao_%28cropped%29.jpg',
    author: 'Aarav Bhat',
    date: '22 Mar 2026',
    readMins: 5,
  },
  {
    id: 'surf',
    category: 'activity',
    title: 'Learning to Surf at Main Beach',
    excerpt:
      'Surf schools have set up along Main Beach\u2019s long, wave-friendly shoreline — the gentle season runs October to February, with rentals and lessons right off the sand.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Mavericks_Surf_Contest_2010b.jpg',
    author: 'Rohan Pai',
    date: '2 Feb 2026',
    readMins: 6,
  },
  {
    id: 'yoga',
    category: 'activity',
    title: 'Full-Moon Yoga on the Sand',
    excerpt:
      'Kudle\u2019s morning shalas and Om\u2019s sunset circles are the coast\u2019s quiet ritual — roll out a mat at sunrise, or join the monthly full-moon gathering when the whole beach hums.',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    author: 'Meera Kamat',
    date: '15 Jan 2026',
    readMins: 4,
  },
  {
    id: 'camping',
    category: 'activity',
    title: 'Camping the Paradise Headland',
    excerpt:
      'Half Moon and Paradise are Gokarna\u2019s camping beaches — pitch your own tent or rent one (\u20b9500\u20131,000 a night) and fall asleep to the waves, with zero streetlights between you and the stars.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Tent_camping_along_the_Sulayr_trail_in_La_Taha%2C_Sierra_Nevada_National_Park_%28DSCF5147%29.jpg',
    author: 'Rohan Pai',
    date: '27 Mar 2026',
    readMins: 7,
  },
  {
    id: 'cooking',
    category: 'activity',
    title: 'A Morning in a Konkani Kitchen',
    excerpt:
      'Roll jolada rotti with a Gokarna grandmother, temper a coconut chutney the slow way, and leave with recipes worth more than any souvenir from Car Street.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Vegetarian_thali_Karnataka_DSC0008.jpg',
    author: 'Devika Nayak',
    date: '18 Jan 2026',
    readMins: 5,
  },
];

const BEACH_INDEX: BeachFact[] = [
  { name: 'Main Beach', vibe: 'Pilgrims & surf schools', access: 'Road · in town', swim: 'Strong currents — care', crowd: 'Busy' },
  { name: 'Kudle Beach', vibe: 'Yoga, shacks & sunsets', access: 'Road or 20 min walk', swim: 'Generally safe by day', crowd: 'Busy' },
  { name: 'Om Beach', vibe: 'Water sports & caf\u00e9s', access: 'Road · 3 km from town', swim: 'Generally safe by day', crowd: 'Busy' },
  { name: 'Half Moon', vibe: 'Secluded crescent', access: 'Trek or boat \u20b9150\u2013300', swim: 'No lifeguards', crowd: 'Calm' },
  { name: 'Paradise', vibe: 'Wild camping cove', access: 'Trek or boat \u20b9300', swim: 'No lifeguards', crowd: 'Calm' },
  { name: 'Nirvana', vibe: 'Tiny secret cove', access: 'Long trek or boat', swim: 'Unpatrolled', crowd: 'Wild' },
  { name: 'Belekan', vibe: 'Quiet northern end', access: '5 km coastal road', swim: 'Unpatrolled', crowd: 'Wild' },
];

const FEATURED_ID = 'atmalinga';

const DEPARTMENTS: { id: Filter; label: string; numeral: string }[] = [
  { id: 'all', label: 'All Stories', numeral: '' },
  { id: 'beach', label: 'Beaches', numeral: 'I' },
  { id: 'culture', label: 'Culture & History', numeral: 'II' },
  { id: 'gem', label: 'Hidden Gems', numeral: 'III' },
  { id: 'activity', label: 'Activities', numeral: 'IV' },
];

const CROWD_STYLE: Record<BeachFact['crowd'], string> = {
  Calm: 'text-tide',
  Busy: 'text-ember',
  Wild: 'text-gold',
};

export const RouteNavigatorPage: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const featured = ARTICLES.find((a) => a.id === FEATURED_ID) ?? ARTICLES[0];
  const featuredMeta = CATEGORY_META[featured.category];

  const visible = filter === 'all' ? ARTICLES : ARTICLES.filter((a) => a.category === filter);
  const showBeachIndex = filter === 'all' || filter === 'beach';

  return (
    <div className="mx-auto w-full max-w-shell space-y-14 sm:space-y-20">
      {/* ============ MASTHEAD ============ */}
      <header className="border-b border-ink pb-8 pt-6 text-center sm:pt-10">
        <div className="flex items-center justify-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-3">
          <span className="h-px w-8 bg-line-2 sm:w-14" />
          Est. 2026 · Uttara Kannada · Karnataka
          <span className="h-px w-8 bg-line-2 sm:w-14" />
        </div>
        <h1 className="mt-6 font-display text-5xl font-black leading-[0.95] tracking-tight text-ink sm:text-7xl lg:text-8xl">
          The Gokarna Journal
        </h1>
        <div className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-[0.4em] text-tide">
          Trails · Temples · Tides
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-base">
          A field guide to the Karavali coast — every beach on the circuit, the history and hidden gems the guidebooks
          skip, and the activities worth waking up early for.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-3">
          <span>Vol. 04</span>
          <span>·</span>
          <span>September 2026</span>
          <span>·</span>
          <span>Free Edition</span>
        </div>
      </header>

      {/* ============ LEAD STORY ============ */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ember">Lead Story</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <article className="group grid overflow-hidden border border-line bg-elevated lg:grid-cols-12">
          <div className="relative min-h-[260px] overflow-hidden sm:min-h-[360px] lg:col-span-7 lg:min-h-[440px]">
            <img
              src={featured.image}
              alt={featured.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-emphasis group-hover:scale-[1.03]"
            />
            <span className="absolute left-5 top-5 bg-paper px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ember">
              Cover Story
            </span>
          </div>
          <div className="flex flex-col justify-center border-t border-line p-7 sm:p-10 lg:col-span-5 lg:border-l lg:border-t-0">
            <div className={cn('flex items-center gap-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em]', featuredMeta.text)}>
              <featuredMeta.icon className="h-3.5 w-3.5" />
              {featuredMeta.label}
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold leading-[1.05] tracking-tight text-ink sm:text-4xl">
              {featured.title}
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-ink-2 first-letter:float-left first-letter:mr-2.5 first-letter:font-display first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.8] first-letter:text-ember">
              {featured.excerpt}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-4 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
              <span className="text-ink">{featured.author}</span>
              <span>·</span>
              <span>{featured.date}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {featured.readMins} min read
              </span>
              <span className="ml-auto flex items-center gap-1.5 font-bold uppercase tracking-widest text-tide">
                Read <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </article>
      </section>

      {/* ============ DEPARTMENTS ============ */}
      <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y border-ink py-4 sm:justify-between">
        {DEPARTMENTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setFilter(d.id)}
            className={cn(
              'font-mono text-[11px] font-semibold uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tide',
              filter === d.id
                ? 'text-ink underline decoration-tide decoration-2 underline-offset-8'
                : 'text-ink-3 hover:text-ink',
            )}
          >
            {d.numeral && <span className="mr-1.5 text-[9px] text-ink-3">{d.numeral}.</span>}
            {d.label}
          </button>
        ))}
        <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-3 md:block">
          {visible.length} dispatches
        </span>
      </nav>

      {/* ============ STORY GRID ============ */}
      <section className="grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((article, i) => {
          const meta = CATEGORY_META[article.category];
          return (
            <article key={article.id} className="group flex flex-col border-t-2 border-ink pt-5">
              <div className="flex items-baseline justify-between font-mono text-[10px] font-semibold uppercase tracking-widest">
                <span className={meta.text}>{meta.label}</span>
                <span className="text-ink-3">No. {String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="relative mt-4 h-52 overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-all duration-emphasis group-hover:scale-[1.04]"
                />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-tide">
                {article.title}
              </h3>
              <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-ink-2 line-clamp-3">{article.excerpt}</p>
              <div className="mt-5 flex items-center gap-x-2.5 gap-y-1 border-t border-line pt-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                <span className="truncate text-ink">{article.author}</span>
                <span className="hidden sm:inline">—</span>
                <span className="truncate">{article.date}</span>
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {article.readMins} min
                </span>
              </div>
            </article>
          );
        })}
      </section>

      {/* ============ PULL QUOTE ============ */}
      <section className="border-y border-ink py-12 text-center sm:py-16">
        <p className="mx-auto max-w-3xl font-display text-2xl font-medium italic leading-snug text-ink sm:text-3xl">
          &ldquo;An ancient Shiva pilgrimage town and a barefoot backpacker coast at the same time — and the two rarely
          get in each other&rsquo;s way.&rdquo;
        </p>
        <div className="mt-5 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-3">
          — Field Notes, The Gokarna Journal
        </div>
      </section>

      {/* ============ BEACH INDEX ============ */}
      {showBeachIndex && (
        <section>
          <div className="mb-6 flex items-end justify-between border-b-2 border-ink pb-4">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-tide">Appendix A</div>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                The Complete Beach Index
              </h2>
            </div>
            <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-3 sm:block">
              Seven beaches · North to South
            </span>
          </div>

          <div className="hidden grid-cols-[1.3fr_1.6fr_1.2fr_1fr_auto] gap-4 border-b border-line pb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink-3 md:grid">
            <span>Beach</span>
            <span>Character</span>
            <span>Access</span>
            <span>Swim</span>
            <span className="text-right">Crowd</span>
          </div>

          {BEACH_INDEX.map((beach) => (
            <div
              key={beach.name}
              className="grid grid-cols-1 gap-1.5 border-b border-line py-4 transition-colors hover:bg-paper-2/60 md:grid-cols-[1.3fr_1.6fr_1.2fr_1fr_auto] md:items-center md:gap-4"
            >
              <span className="font-display text-lg font-bold leading-tight text-ink">{beach.name}</span>
              <span className="text-[13px] text-ink-2">{beach.vibe}</span>
              <span className="font-mono text-[11px] font-semibold text-ink-3">{beach.access}</span>
              <span className="font-mono text-[11px] font-semibold text-ink-3">{beach.swim}</span>
              <span className={cn('font-mono text-[10px] font-bold uppercase tracking-widest md:text-right', CROWD_STYLE[beach.crowd])}>
                {beach.crowd}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ============ FIELD NOTES ============ */}
      <section className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="border-t-2 border-tide pt-6">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-tide">I.</span>
            <h3 className="font-display text-2xl font-bold tracking-tight text-ink">Before you swim</h3>
          </div>
          <ul className="mt-6 space-y-4 text-[13px] leading-relaxed text-ink-2">
            <li>
              Om and Kudle are generally safe for a daytime swim; Main Beach has stronger currents — respect the flags.
            </li>
            <li>Half Moon and Paradise have no lifeguards and hidden rocks — never swim alone at the remote coves.</li>
            <li>
              Boats run between the beaches by day; the last ferry back from Paradise usually leaves by 17:30&ndash;18:00.
            </li>
            <li>On calm monsoon nights, faint bioluminescence is sometimes spotted off Om Beach and Paradise.</li>
          </ul>
        </div>

        <div className="border-t-2 border-ember pt-6">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-ember">II.</span>
            <h3 className="font-display text-2xl font-bold tracking-tight text-ink">Temple town etiquette</h3>
          </div>
          <ul className="mt-6 space-y-4 text-[13px] leading-relaxed text-ink-2">
            <li>
              Shoulders and knees covered inside Mahabaleshwara and Maha Ganapati — carry a light scarf for the
              beach-to-temple walk.
            </li>
            <li>Footwear and leather stay at the gate; photography of the sanctum is not permitted.</li>
            <li>Darshan runs 6:00&ndash;12:30 and 17:00&ndash;20:00 — the quietest window is the first half hour after opening.</li>
            <li>Kotiteertha is for ritual bathing, not recreation — no soap, no litter, descend by the stone steps.</li>
          </ul>
        </div>
      </section>

      {/* ============ NEWSLETTER ============ */}
      <section className="border border-line bg-ink text-paper">
        <div className="grid grid-cols-1 gap-6 p-7 sm:p-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-tide-glow">
              The Sunday Tide — Letters
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold leading-tight sm:text-3xl">
              One letter every Sunday — tides, trails, temple timings.
            </h3>
            <p className="mt-3 text-[13px] leading-relaxed text-paper/70">
              No spam, no booking nudges. Just the week&rsquo;s sea state, the best beach for the weekend, and one
              cultural story worth knowing before you visit.
            </p>
          </div>
          <div>
            {subscribed ? (
              <div className="flex items-center gap-3 border border-tide-glow/40 bg-tide/15 p-4">
                <Check className="h-5 w-5 shrink-0 text-tide-glow" />
                <span className="text-sm font-semibold">Subscribed — see you on Sunday.</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) setSubscribed(true);
                }}
                className="flex flex-col gap-2.5 sm:flex-row"
              >
                <label className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper/50" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-paper/20 bg-paper/10 py-3 pl-10 pr-3 text-sm text-paper placeholder:text-paper/40 focus:border-tide-glow focus:outline-none focus:ring-1 focus:ring-tide-glow"
                  />
                </label>
                <button
                  type="submit"
                  className="bg-tide px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-tide-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-tide-glow"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ============ END MARK ============ */}
      <footer className="pb-10 pt-4 text-center">
        <span className="text-lg text-ink-3">◆</span>
        <div className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-3">
          End of Issue · Vol. 04
        </div>
      </footer>
    </div>
  );
};
