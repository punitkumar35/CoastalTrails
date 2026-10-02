import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useSEO } from '../lib/seo';

const dispatches = [
  {
    no: 'No. 01',
    cat: 'Beaches',
    title: 'Best Beaches in Gokarna',
    desc: 'Kudle, Om, Half Moon, Paradise, Nirvana and Belekan — what each one is like and how to reach it.',
    link: '/gokarna/beaches/',
    action: 'Beach-by-beach guide →',
    img: '/images/gokarna/gokarna-beach-waves-aerial.webp',
    alt: 'Waves washing over the sand on a Gokarna beach seen from above',
  },
  {
    no: 'No. 02',
    cat: 'Trek',
    catColor: 'cat-ember',
    title: 'Gokarna 5-Beach Trek',
    desc: 'Route, distance, difficulty, best time and safety for the cliff walk from Kudle to Belekan.',
    link: '/gokarna/5-beach-trek/',
    action: 'Full trek guide →',
    img: '/images/gokarna/gokarna-5-beach-trek-coastline-aerial.webp',
    alt: 'The coastline walked on the Gokarna 5-beach trek, seen from above',
  },
  {
    no: 'No. 03',
    cat: 'Experiences',
    catColor: 'cat-gold',
    title: 'Tours & Coastal Experiences',
    desc: 'Boat rides, kayaking, dolphin watching, surfing and watersports — what is worth doing and when.',
    link: '/gokarna/tours/',
    action: 'Browse experiences →',
    img: '/images/gokarna/gokarna-om-beach-clifftop-view.jpg',
    alt: 'View from the clifftop over Om Beach with a boat in the bay',
  },
  {
    no: 'No. 04',
    cat: 'Camping',
    title: 'Gokarna Beach Camping',
    desc: 'Tent camping at Half Moon and Paradise — season, costs, safety and leave-no-trace basics.',
    link: '/gokarna/camping/',
    action: 'Camping guide →',
    img: '/images/gokarna/western-ghats-waterfall-gokarna.webp',
    alt: 'A tall waterfall in the Western Ghats forest near Gokarna',
  },
  {
    no: 'No. 05',
    cat: 'Things to do',
    catColor: 'cat-ember',
    title: 'Things to Do in Gokarna',
    desc: 'Temples, sunsets, sea caves, surf schools and day trips, beyond the obvious beach-hopping.',
    link: '/gokarna/things-to-do/',
    action: 'Things to do →',
    img: '/images/gokarna/murudeshwar-temple-near-gokarna.jpg',
    alt: 'The giant Shiva statue and temple towers at Murudeshwar near Gokarna',
  },
  {
    no: 'No. 06',
    cat: 'Travel guides',
    catColor: 'cat-gold',
    title: 'Itineraries, Costs & Practicalities',
    desc: 'Best time to visit, how to reach Gokarna, 2-day and 3-day itineraries and a full trip-cost breakdown.',
    link: '/gokarna/travel-guide/',
    action: 'All travel guides →',
    img: '/images/gokarna/gokarna-mahabaleshwara-temple.jpg',
    alt: 'Carved stone gopuram of an ancient temple in Gokarna',
  },
];

const faqs = [
  {
    q: 'Is Gokarna worth visiting?',
    a: 'Yes. Gokarna pairs a living temple town with a walkable chain of beaches — Kudle, Om, Half Moon, Paradise and Belekan — plus day trips to Mirjan Fort, Yana rocks and Murudeshwar. It suits travellers who want coast and culture without Goa’s crowds.',
  },
  {
    q: 'How many days do you need in Gokarna?',
    a: 'Two days cover the temple town and the 5-beach trek. Three days add beach time, camping or a day trip to Mirjan Fort, Yana or Murudeshwar. Add a fourth day if you want to slow down.',
  },
  {
    q: 'Is the Gokarna beach trek difficult?',
    a: 'It is easy to moderate. Roughly 6–8 km with rocky clifftop sections and a few steep ups and downs, but no technical climbing. Most reasonably fit walkers finish in 4–6 hours with stops.',
  },
  {
    q: 'When is the best time to visit Gokarna?',
    a: 'October to March, with November to February offering calm seas, open shacks and comfortable trekking weather. The monsoon is lush but rough at sea, and April to May is hot and humid.',
  },
  {
    q: 'How do you get to Gokarna?',
    a: 'Gokarna Road railway station is about 10 km from town. The nearest airports are Dabolim and Mopa in Goa (roughly 150–160 km), and Hubballi (about 165 km). Overnight buses run from Bengaluru, Goa and Mangaluru.',
  },
];

export function GokarnaGuidePage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useSEO({
    title: 'Gokarna Travel Guide: Beaches, 5-Beach Trek, Camping & Itineraries | Coastal Trails',
    description: 'The comprehensive Gokarna travel guide: best beaches, the cliff trek, camping at Half Moon, travel costs, local stays, and practical tips.',
    canonical: 'https://coastaltrails.in/gokarna/',
  });

  useEffect(() => {
    if (!document.getElementById('gokarna-editorial-css')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/gokarna/assets/editorial.css';
      link.id = 'gokarna-editorial-css';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <>

      <div className="ed-wrap pt-6 sm:pt-10">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <button onClick={() => navigate('/')} className="hover:underline">
                Home
              </button>
            </li>
            <li aria-current="page">Gokarna</li>
          </ol>
        </nav>

        <header className="ed-masthead">
          <div className="ed-eyebrow">Est. 2026 · Uttara Kannada · Karnataka</div>
          <h1>Gokarna Travel Guide</h1>
          <div className="ed-tagline">Beaches · Trek · Camping · Guides</div>
          <p className="ed-standfirst">
            A temple town with a beach trail attached. Gokarna packs the Mahabaleshwara temple, five walkable beaches, a
            cliff trek, tent camping and day trips to Mirjan Fort and Yana into one compact stretch of the Konkan coast.
          </p>
          <div className="ed-edition">
            <span>Vol. 01</span>
            <span>·</span>
            <span>September 2026</span>
            <span>·</span>
            <span>Free Edition</span>
          </div>
          <dl className="ed-factstrip">
            <div>
              <dt>Best season</dt>
              <dd>October–March</dd>
            </div>
            <div>
              <dt>5-beach trek</dt>
              <dd>6–8 km · 4–6 hours</dd>
            </div>
            <div>
              <dt>Nearest rail</dt>
              <dd>Gokarna Road · 10 km</dd>
            </div>
          </dl>
        </header>

        <section className="mt-8">
          <div className="ed-label">
            <span>Lead Story</span>
          </div>
          <article className="ed-lead">
            <div className="ed-lead-media">
              <img
                src="/images/gokarna/gokarna-coastline-aerial-hero.jpg"
                alt="Aerial view of a Gokarna beach with turquoise water, boats on golden sand and palm-lined headlands"
                width={1920}
                height={1080}
              />
              <span className="ed-cover-tag">Cover Story</span>
            </div>
            <div className="ed-lead-body">
              <div className="ed-cat">The Headline Walk</div>
              <h2>Gokarna 5-Beach Trek</h2>
              <p className="ed-dropcap">
                Kudle to Belekan via Om, Half Moon and Paradise — a clifftop chain of coves that no road connects. Six to
                eight kilometres, four to six hours, and easily the best day on this coast.
              </p>
              <div className="ed-byline">
                <strong>Coastal Trails</strong>
                <span>·</span>
                <span>September 2026</span>
                <span>·</span>
                <span>6 min read</span>
                <a className="ed-read" href="/gokarna/5-beach-trek/">
                  Read the guide →
                </a>
              </div>
            </div>
          </article>
        </section>

        <nav className="ed-depts" aria-label="Guide sections">
          <a href="/gokarna/beaches/">
            <b>I.</b>Beaches
          </a>
          <a href="/gokarna/5-beach-trek/">
            <b>II.</b>Beach Trek
          </a>
          <a href="/gokarna/tours/">
            <b>III.</b>Experiences
          </a>
          <a href="/gokarna/camping/">
            <b>IV.</b>Camping
          </a>
          <a href="/gokarna/things-to-do/">
            <b>V.</b>Things to Do
          </a>
          <a href="/gokarna/travel-guide/">
            <b>VI.</b>Travel Guides
          </a>
        </nav>

        <section>
          <div className="ed-head">
            <div>
              <p className="kicker">The Dispatches</p>
              <h2>Everything worth knowing, in six guides</h2>
            </div>
            <span className="aside">Six dispatches · Updated September 2026</span>
          </div>
          <div className="ed-grid">
            {dispatches.map((d) => (
              <article key={d.no} className="ed-story">
                <div className="ed-story-top">
                  <span className={`cat ${d.catColor || ''}`}>{d.cat}</span>
                  <span className="no">{d.no}</span>
                </div>
                <img src={d.img} alt={d.alt} width={720} height={1280} loading="lazy" />
                <h3>{d.title}</h3>
                <p>{d.desc}</p>
                <div className="ed-more">
                  <a href={d.link}>{d.action}</a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="ed-head">
            <div>
              <p className="kicker">The Coast, in Brief</p>
              <h2>A temple town that never stopped being a beach town</h2>
            </div>
          </div>
          <div className="ed-cols">
            <div className="ed-prose">
              <p>
                Gokarna sits where the Western Ghats meet the Arabian Sea, about 480 km from Bengaluru and 140 km south
                of Goa. Its name means “cow's ear”, and its Mahabaleshwara temple has drawn pilgrims for centuries. What
                makes it unusual is that the pilgrim shore and the traveller coast sit on the same footpath: Gokarna Main
                Beach leads to Kudle, then Om, Half Moon, Paradise and Belekan in a chain of coves you can walk end to
                end.
              </p>
              <p>
                That walk — the <a href="/gokarna/5-beach-trek/">Gokarna beach trek</a> — is the reason many people come.
                The rest stay for the shack culture on <a href="/gokarna/beaches/">Kudle and Om</a>, tent nights at Half
                Moon and Paradise, temple mornings in town, and day trips to the laterite ramparts of Mirjan Fort or the
                limestone towers of Yana.
              </p>
              <p>
                It is not a resort destination. Expect seasonal shacks, patchy mobile signal south of Om, no lifeguards on
                the wild beaches and a pace that rewards people who slow down.
              </p>
              <h3>Where Gokarna fits, by traveller</h3>
              <ul>
                <li>
                  <strong>First-timers:</strong> 2 days for the temple town, Kudle and Om, plus the trek.
                </li>
                <li>
                  <strong>Trekkers:</strong> 3 days with the full 5-beach route and camping at Paradise.
                </li>
                <li>
                  <strong>Slow travellers:</strong> a week, mixing beach time, yoga, surfing and day trips.
                </li>
                <li>
                  <strong>Pilgrims:</strong> Mahabaleshwara, Maha Ganapati and Kotiteertha in a morning, ideally around
                  Shivaratri.
                </li>
              </ul>
            </div>
            <aside className="ed-factbox">
              <h2>Gokarna at a glance</h2>
              <ul>
                <li>
                  <strong>State:</strong> Karnataka, Uttara Kannada district
                </li>
                <li>
                  <strong>Nearest railway:</strong> Gokarna Road (GOK), ~10 km
                </li>
                <li>
                  <strong>Nearest airports:</strong> Dabolim / Mopa (Goa), ~150–160 km
                </li>
                <li>
                  <strong>Best season:</strong> October–March
                </li>
                <li>
                  <strong>Ideal trip:</strong> 2–3 days
                </li>
                <li>
                  <strong>Beaches:</strong> Main, Kudle, Om, Half Moon, Paradise, Nirvana, Belekan
                </li>
                <li>
                  <strong>Known for:</strong> beach trek, temple town, camping
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="ed-pull">
          <p>
            &ldquo;An ancient Shiva pilgrimage town and a barefoot backpacker coast at the same time — and the two rarely
            get in each other&rsquo;s way.&rdquo;
          </p>
          <span>— Field Notes, The Gokarna Journal</span>
        </section>

        <section>
          <div className="ed-head">
            <div>
              <p className="kicker">Appendix A</p>
              <h2>The trek, at a glance</h2>
            </div>
            <span className="aside">
              <a href="/gokarna/5-beach-trek/">Full trek guide →</a>
            </span>
          </div>
          <dl className="ed-index">
            <div>
              <dt>Route</dt>
              <dd>Kudle → Om → Half Moon → Paradise → Belekan</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>About 6–8 km from Kudle, 8–9 km from town</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>4–6 hours with stops</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>Easy to moderate, rocky in places</dd>
            </div>
            <div>
              <dt>Best time</dt>
              <dd>October–March, start by 8 AM</dd>
            </div>
            <div>
              <dt>Return</dt>
              <dd>Boat or auto from Belekan/Paradise</dd>
            </div>
          </dl>
        </section>

        <section className="ed-faq">
          <div className="ed-head">
            <div>
              <p className="kicker">Common questions</p>
              <h2>Practical FAQs about Gokarna</h2>
            </div>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details
                key={i}
                open={openFaq === i}
                onClick={(e) => {
                  e.preventDefault();
                  setOpenFaq(openFaq === i ? null : i);
                }}
                className="group cursor-pointer rounded-2xl border border-line bg-elevated p-4 transition-colors"
              >
                <summary className="flex items-center justify-between text-sm font-semibold text-ink">
                  {f.q}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180 text-tide' : 'text-ink-3'
                    }`}
                  />
                </summary>
                {openFaq === i && <p className="mt-3 text-xs leading-relaxed text-ink-2">{f.a}</p>}
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export default GokarnaGuidePage;
