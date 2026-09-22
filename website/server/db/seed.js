import { initDatabase, run } from './index.js';

const IMG = {
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  house: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
  villa: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
  resort: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
  shore: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
  hotel: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
  rooms: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  exterior: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
  interior: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  camp: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80',
  trail: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  bedroom: 'https://images.unsplash.com/photo-1517840901100-8179e982acb7?auto=format&fit=crop&w=1200&q=80',
};

const homestays = [
  {
    id: 'gokarna-1',
    title: 'Kudle Clifftop Wooden Cottage',
    subtitle: 'Handcrafted wooden cottage overlooking the Kudle cove',
    location: 'kudle',
    location_display: 'Kudle Beach',
    price_per_night: 2200,
    rating: 4.92,
    reviews_count: 88,
    host_name: 'Manjunath Hegde',
    host_whatsapp: '+919845123091',
    is_host_verified: 1,
    walking_minutes_to_beach: 4,
    total_rooms: 2,
    description:
      'Perched on the Kudle clifftop with a private balcony facing the Arabian Sea. Reclaimed Malabar teak interiors, an open-air shower and a sunset deck that turns golden every evening. Hosts serve filter coffee and neer dosa breakfast on the verandah.',
    images: [IMG.beach, IMG.house, IMG.interior],
    badges: ['Cliff Edge', 'Sunset View', 'Family Host'],
    amenities: ['Sunset Balcony & Hammock', 'Mosquito Netting', 'Home-cooked South Indian Breakfast', 'Scooter Parking Available', 'Fast WiFi'],
  },
  {
    id: 'gokarna-2',
    title: 'Om Beach Nirvana Palm Shack',
    subtitle: 'Steps away from the iconic Om rock formations & surf',
    location: 'om',
    location_display: 'Om Beach',
    price_per_night: 1600,
    rating: 4.8,
    reviews_count: 98,
    host_name: 'Ganesh Naik',
    host_whatsapp: '+919448211982',
    is_host_verified: 1,
    walking_minutes_to_beach: 1,
    total_rooms: 3,
    description:
      'Step directly out of your room into the golden sands of Om Beach. Surrounded by swaying coconut palms, this eco-shack offers the authentic Bohemian Gokarna vibe. Fall asleep to the crashing waves and wake up to surf lessons at the break.',
    images: [IMG.shore, IMG.hotel, IMG.beach],
    badges: ['Beachfront', 'Cafe Attached', 'Surfboard Rental'],
    amenities: ['Direct Beach Access (30 seconds)', 'Attached Open-Sky Bathroom', 'Ceiling Fan & Power Backup', 'Cafe Serving Nutella Pancakes & Chai', 'Yoga Mats Available'],
  },
  {
    id: 'gokarna-3',
    title: 'Half Moon Secluded Rock Cottage',
    subtitle: 'Trek-in ocean retreat away from all crowds and roads',
    location: 'halfMoon',
    location_display: 'Half Moon Beach',
    price_per_night: 1900,
    rating: 4.95,
    reviews_count: 64,
    host_name: 'Devdas Gowda',
    host_whatsapp: '+919741088219',
    is_host_verified: 1,
    walking_minutes_to_beach: 2,
    total_rooms: 2,
    description:
      'Accessible only via a 20-minute scenic cliff trek from Om Beach or a 5-minute fishing boat ride. Half Moon is Gokarna’s best-kept secret with zero car noise, pristine waters, and bioluminescent night waves during high tide.',
    images: [IMG.beach, IMG.house],
    badges: ['Off-Grid Eco', 'Starlit Sky', 'Boat Drop Included'],
    amenities: ['Solar Powered Lighting', 'Fresh Spring Well Water', 'Organic Coconut Grove Garden', 'Trek Guide & Boat Pickup', 'Complimentary Beach Bonfire'],
  },
  {
    id: 'gokarna-4',
    title: 'Main Beach Coconut Garden Heritage',
    subtitle: 'Old-style Karavali tiled home near temple and town market',
    location: 'mainBeach',
    location_display: 'Main Beach',
    price_per_night: 1400,
    rating: 4.7,
    reviews_count: 112,
    host_name: 'Subramanya Bhat',
    host_whatsapp: '+919980577123',
    is_host_verified: 1,
    walking_minutes_to_beach: 5,
    total_rooms: 3,
    description:
      'A quiet 80-year-old coastal estate tucked in a coconut orchard between Gokarna Main Beach and the ancient Mahabaleshwar Temple. Ideal for remote workers and cultural travelers seeking calm spaces with modern connectivity.',
    images: [IMG.exterior, IMG.interior],
    badges: ['Family Friendly', 'Fast WiFi', 'Kitchen Access'],
    amenities: ['High-Speed Fiber Internet (100 Mbps)', 'Traditional Red Oxide Flooring', 'Equipped Kitchenette', 'Air Conditioning in Master Room', 'Free Parking on Premises'],
  },
  {
    id: 'gokarna-5',
    title: 'Paradise Beach Eco Cliff Pod',
    subtitle: 'Camp under the stars on the edge of the Arabian sea',
    location: 'paradise',
    location_display: 'Paradise Beach',
    price_per_night: 1200,
    rating: 4.85,
    reviews_count: 88,
    host_name: 'Venkatesh Patgar',
    host_whatsapp: '+919148034567',
    is_host_verified: 1,
    walking_minutes_to_beach: 1,
    total_rooms: 5,
    description:
      'Situated on the pristine sands of Paradise Beach (Full Moon Beach), this eco pod provides a true back-to-nature Gokarna experience with warm campfires, acoustic evenings, and crystal clear sea breezes.',
    images: [IMG.camp, IMG.trail],
    badges: ['Boutique Camp', 'Ocean View', 'Hammock Zone'],
    amenities: ['Elevated Weatherproof Pod Bedding', 'Communal Beach Cafe & Chill Lounge', 'Shared Clean Washrooms', 'Charging Lockers Available', 'Daily Sunset Acoustic Jam'],
  },
  {
    id: 'gokarna-6',
    title: 'Kudle Sunrise Yoga Homestay',
    subtitle: 'Morning rooftop yoga with sea-facing shala',
    location: 'kudle',
    location_display: 'Kudle Beach',
    price_per_night: 1450,
    rating: 4.78,
    reviews_count: 134,
    host_name: 'Lakshmi Kamath',
    host_whatsapp: '+919611003322',
    is_host_verified: 1,
    walking_minutes_to_beach: 3,
    total_rooms: 4,
    description:
      'A light-filled family home with a rooftop yoga shala that faces the sunrise over Kudle bay. Breakfasts are vegetarian, long-table, and shared with other travelers — many of whom extend their stay by a week.',
    images: [IMG.resort, IMG.bedroom, IMG.house],
    badges: ['Sunset View', 'Fast WiFi', 'Family Host'],
    amenities: ['Rooftop Yoga Shala', 'Vegetarian Breakfast Included', 'Fast WiFi', 'Shared Reading Lounge', 'Laundry Service'],
  },
  {
    id: 'gokarna-7',
    title: 'Om Beach Bohemian Surf Stay',
    subtitle: 'Surf shack rooms facing the Om break',
    location: 'om',
    location_display: 'Om Beach',
    price_per_night: 1750,
    rating: 4.83,
    reviews_count: 76,
    host_name: 'Rahul Suvarna',
    host_whatsapp: '+918879912001',
    is_host_verified: 1,
    walking_minutes_to_beach: 0,
    total_rooms: 2,
    description:
      'Two surf-themed rooms right on the Om Beach shoreline, run by a local surf instructor. Board rentals, sunrise sessions and tide-chart chalkboards by the door. Not fancy — unforgettable.',
    images: [IMG.beach, IMG.hotel],
    badges: ['Beachfront', 'Surfboard Rental', 'Kitchen Access'],
    amenities: ['Beachfront Rooms', 'Surfboard & Wetsuit Rental', 'Outdoor Shower', 'Beach Towels Provided', 'Chai & Snack Bar'],
  },
  {
    id: 'gokarna-8',
    title: 'Half Moon Starlit Eco Cabin',
    subtitle: 'One-room cabin under the darkest skies in Gokarna',
    location: 'halfMoon',
    location_display: 'Half Moon Beach',
    price_per_night: 2100,
    rating: 4.9,
    reviews_count: 41,
    host_name: 'Shweta Nayak',
    host_whatsapp: '+919480553377',
    is_host_verified: 1,
    walking_minutes_to_beach: 8,
    total_rooms: 1,
    description:
      'A single off-grid cabin set back in the Half Moon headland. No light pollution, a telescope on the deck, and the Milky Way in season. Perfect for couples, writers, and anyone escaping notifications.',
    images: [IMG.house, IMG.interior],
    badges: ['Off-Grid Eco', 'Starlit Sky', 'Couples Favorite'],
    amenities: ['Telescope & Sky Deck', 'Solar Power & USB Charging', 'Compost Toilet', 'Fresh Water Tank', 'Campfire Pit'],
  },
  {
    id: 'gokarna-9',
    title: 'Town Temple View Heritage House',
    subtitle: 'Traditional Gowda home beside Mahabaleshwar temple',
    location: 'town',
    location_display: 'Gokarna Town',
    price_per_night: 1300,
    rating: 4.72,
    reviews_count: 156,
    host_name: 'Narayan Hegde',
    host_whatsapp: '+919916283344',
    is_host_verified: 1,
    walking_minutes_to_beach: 10,
    total_rooms: 5,
    description:
      'In the heart of temple town, this heritage house has hosted pilgrims and wanderers for three generations. Morning temple bells, a courtyard for evening chats, and the market street two minutes away.',
    images: [IMG.exterior, IMG.bedroom],
    badges: ['Family Host', 'Kitchen Access', 'Fast WiFi'],
    amenities: ['Temple View Courtyard', 'Filtered Drinking Water', 'Hot Water Geyser', 'Fast WiFi', 'Bicycle Rentals Nearby'],
  },
  {
    id: 'gokarna-10',
    title: 'Paradise Beach Family Cabanas',
    subtitle: 'Roomier cabanas for families right on the sand',
    location: 'paradise',
    location_display: 'Paradise Beach',
    price_per_night: 2300,
    rating: 4.88,
    reviews_count: 92,
    host_name: 'Jayashree Patgar',
    host_whatsapp: '+919449082273',
    is_host_verified: 1,
    walking_minutes_to_beach: 2,
    total_rooms: 4,
    description:
      'The larger cabanas on Paradise Beach, built for families — two double beds, a shaded sit-out and meals from the host family kitchen. Kids paddle in the calm northern cove while parents watch from the porch.',
    images: [IMG.camp, IMG.resort],
    badges: ['Family Friendly', 'Beachfront', 'Sunset View'],
    amenities: ['Two Double Beds', 'Family Kitchen Meals', 'Shaded Sit-Out Porch', 'Safe Swimming Cove', 'Board Games & Cards'],
  },
  {
    id: 'gokarna-11',
    title: 'Main Beach Cliff Terraces',
    subtitle: 'Layered terraced rooms with sweeping bay views',
    location: 'mainBeach',
    location_display: 'Main Beach',
    price_per_night: 2400,
    rating: 4.93,
    reviews_count: 58,
    host_name: 'Anil Bhat',
    host_whatsapp: '+919845667788',
    is_host_verified: 1,
    walking_minutes_to_beach: 6,
    total_rooms: 3,
    description:
      'Carved into the laterite cliff above Main Beach, each terrace room steps down toward the sea. Private hammocks, an infinity-edge dipping pool, and the best sunset angle on the Karavali coast.',
    images: [IMG.villa, IMG.resort, IMG.bedroom],
    badges: ['Cliff Edge', 'Sunset View', 'Fast WiFi'],
    amenities: ['Private Sea-Facing Terrace', 'Infinity Dipping Pool', 'Fast WiFi', 'Minibar', 'Daily Housekeeping'],
  },
  {
    id: 'gokarna-12',
    title: 'Kudle Backpacker Garden Rooms',
    subtitle: 'Green garden rooms for travelers on a budget',
    location: 'kudle',
    location_display: 'Kudle Beach',
    price_per_night: 950,
    rating: 4.6,
    reviews_count: 203,
    host_name: 'Ramesh Achari',
    host_whatsapp: '+919448901122',
    is_host_verified: 0,
    walking_minutes_to_beach: 5,
    total_rooms: 6,
    description:
      'Simple, spotless garden rooms behind Kudle’s main cafe strip. Shared kitchen, weekly bonfires and a noticeboard full of treks, scooter shares and boat rides. The social heart of the Kudle backpacker scene.',
    images: [IMG.exterior, IMG.bedroom],
    badges: ['Budget Friendly', 'Kitchen Access'],
    amenities: ['Shared Guest Kitchen', 'Common Hammock Garden', '24h Check-in', 'Lockers', 'Cafe Strip 1 Min Away'],
  },
];

const routes = [
  {
    id: 'route-kudle-om',
    start_point: 'Kudle Beach Clifftop',
    start_subtext: 'Starting point • Cliff trail head',
    destination: 'Om Beach Rock Formations',
    destination_subtext: 'Destination • Beachside shack',
    distance_km: 4.2,
    walking_mins: 120,
    scooter_mins: 60,
    car_mins: 45,
    bus_mins: 35,
    active_mode: 'scooter',
  },
  {
    id: 'route-om-halfmoon',
    start_point: 'Om Beach Jetty',
    start_subtext: 'Fishing boat pickup point',
    destination: 'Half Moon Secluded Cove',
    destination_subtext: 'Trek-in beach, no roads',
    distance_km: 2.8,
    walking_mins: 90,
    scooter_mins: 0,
    car_mins: 0,
    bus_mins: 0,
    active_mode: 'boat',
  },
  {
    id: 'route-main-town',
    start_point: 'Main Beach Shoreline',
    start_subtext: 'Temple ghat road',
    destination: 'Gokarna Town Market',
    destination_subtext: 'Mahabaleshwar temple street',
    distance_km: 1.6,
    walking_mins: 20,
    scooter_mins: 8,
    car_mins: 10,
    bus_mins: 12,
    active_mode: 'walking',
  },
  {
    id: 'route-town-paradise',
    start_point: 'Gokarna Town Stand',
    start_subtext: 'Auto & jeep queue',
    destination: 'Paradise Beach Camps',
    destination_subtext: 'Full Moon beach pods',
    distance_km: 6.5,
    walking_mins: 150,
    scooter_mins: 35,
    car_mins: 30,
    bus_mins: 45,
    active_mode: 'auto',
  },
];

export async function seed() {
  console.log('--- Initializing and Seeding Gokarna Database ---');
  await initDatabase();

  await run(`INSERT IGNORE INTO users (id, phone, name, email, role) VALUES 
    ('user-1', '+919876543210', 'Punit Sharma', 'punit@gokarnaconnect.in', 'traveler'),
    ('host-1', '+919845123091', 'Manjunath Hegde', 'kudle.cottages@gmail.com', 'host'),
    ('admin-1', '+919000000000', 'Gokarna Admin', 'admin@gokarnaconnect.in', 'admin')
  `);

  // Remove demo bookings first so REPLACE on homestays cannot hit FK constraints
  await run(`DELETE FROM bookings`);

  for (const h of homestays) {
    await run(
      `REPLACE INTO homestays 
        (id, title, subtitle, location, location_display, price_per_night, rating, reviews_count, host_name, host_whatsapp, is_host_verified, walking_minutes_to_beach, total_rooms, availability_listed, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        h.id,
        h.title,
        h.subtitle,
        h.location,
        h.location_display,
        h.price_per_night,
        h.rating,
        h.reviews_count,
        h.host_name,
        h.host_whatsapp,
        h.is_host_verified,
        h.walking_minutes_to_beach,
        h.total_rooms,
        h.description,
      ]
    );

    await run(`DELETE FROM homestay_images WHERE homestay_id = ?`, [h.id]);
    for (let i = 0; i < h.images.length; i++) {
      await run(`INSERT INTO homestay_images (homestay_id, image_url, sort_order) VALUES (?, ?, ?)`, [h.id, h.images[i], i]);
    }

    await run(`DELETE FROM homestay_amenities WHERE homestay_id = ?`, [h.id]);
    for (const a of h.amenities) {
      await run(`INSERT INTO homestay_amenities (homestay_id, amenity) VALUES (?, ?)`, [h.id, a]);
    }

    await run(`DELETE FROM homestay_badges WHERE homestay_id = ?`, [h.id]);
    for (const b of h.badges) {
      await run(`INSERT INTO homestay_badges (homestay_id, badge) VALUES (?, ?)`, [h.id, b]);
    }
  }

  // Enclaves power the admin dashboard grouping
  const enclaves = [
    { id: 'kudle', label: 'Kudle Beach', sort_order: 1 },
    { id: 'om', label: 'Om Beach', sort_order: 2 },
    { id: 'halfmoon', label: 'Half Moon Cove', sort_order: 3 },
    { id: 'paradise', label: 'Paradise Beach', sort_order: 4 },
    { id: 'mainbeach', label: 'Main Beach', sort_order: 5 },
    { id: 'town', label: 'Gokarna Town', sort_order: 6 },
  ];
  for (const e of enclaves) {
    await run('REPLACE INTO enclaves (id, label, sort_order) VALUES (?, ?, ?)', [e.id, e.label, e.sort_order]);
  }

  for (const r of routes) {
    await run(
      `REPLACE INTO transit_routes 
        (id, start_point, start_subtext, destination, destination_subtext, distance_km, walking_mins, scooter_mins, car_mins, bus_mins, active_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.start_point,
        r.start_subtext,
        r.destination,
        r.destination_subtext,
        r.distance_km,
        r.walking_mins,
        r.scooter_mins,
        r.car_mins,
        r.bus_mins,
        r.active_mode,
      ]
    );
  }

  console.log(
    `Database seeded successfully with ${homestays.length} Gokarna stays and ${routes.length} routes. Bookings are created only by real users.`
  );
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
