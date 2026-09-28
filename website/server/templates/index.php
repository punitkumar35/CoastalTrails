<?php
// ============================================================================
// Coastal Trails — Dynamic Metadata & Social Crawler Card Generator (Vite SPA)
// ============================================================================
// WhatsApp, Facebook, Twitter, Telegram, LinkedIn, and iMessage scrapers do not
// execute client JavaScript. This PHP proxy reads the built index.html and injects
// real-time, stay-specific OpenGraph, Twitter Card, and Schema.org metadata
// before delivering the HTML payload. Regular human browsers receive the exact
// same page and React mounts seamlessly.
// ============================================================================

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH);

// 1. Locate built index.html
$indexPath = __DIR__ . '/index.html';
if (!file_exists($indexPath)) {
    http_response_code(404);
    echo "Application entrypoint not found.";
    exit;
}

// 1.5. If request is for a static Gokarna guide page, serve it directly
if (preg_match('#^/gokarna(/.*)?$#', $path)) {
    $cleanPath = rtrim($path, '/');
    $targetFile = __DIR__ . $cleanPath;
    if (is_dir($targetFile)) {
        $targetFile .= '/index.html';
    } elseif (!file_exists($targetFile) && file_exists($targetFile . '/index.html')) {
        $targetFile .= '/index.html';
    }
    if (file_exists($targetFile) && !is_dir($targetFile)) {
        $ext = pathinfo($targetFile, PATHINFO_EXTENSION);
        if ($ext === 'html') {
            header('Content-Type: text/html; charset=UTF-8');
        } elseif ($ext === 'css') {
            header('Content-Type: text/css');
        } elseif ($ext === 'js') {
            header('Content-Type: application/javascript');
        } elseif (in_array($ext, ['webp', 'jpg', 'jpeg', 'png', 'svg'])) {
            header('Content-Type: image/' . ($ext === 'svg' ? 'svg+xml' : $ext));
        }
        readfile($targetFile);
        exit;
    }
}

$html = file_get_contents($indexPath);

// 2. Check for Stay detail route: /stay/{id}
if (preg_match('#^/stay/([a-zA-Z0-9\-]+)$#', $path, $matches)) {
    $stayId = $matches[1];

    try {
        $pdo = new PDO(
            'mysql:host=localhost;dbname=coastaee_gokarna;charset=utf8mb4',
            'coastaee_dbuser',
            'Goodnight01@#DB!',
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 2,
            ]
        );

        $stmt = $pdo->prepare('SELECT id, title, subtitle, location, location_display, price_per_night, rating, reviews_count, description FROM homestays WHERE id = ? LIMIT 1');
        $stmt->execute([$stayId]);
        $stay = $stmt->fetch();

        if ($stay) {
            $imgStmt = $pdo->prepare('SELECT image_url FROM homestay_images WHERE homestay_id = ? ORDER BY sort_order ASC LIMIT 1');
            $imgStmt->execute([$stayId]);
            $imgRow = $imgStmt->fetch();

            $priceFmt = '₹' . number_format($stay['price_per_night']);
            $loc = !empty($stay['location_display']) ? $stay['location_display'] : ucwords(preg_replace('/(?<!^)[A-Z]/', ' $0', $stay['location']));
            $titleText = htmlspecialchars($stay['title'] . ' (' . $priceFmt . '/night) — ' . $loc . ' | Coastal Trails Gokarna', ENT_QUOTES, 'UTF-8');
            $rawDesc = trim(preg_replace('/\s+/', ' ', strip_tags($stay['description'] ?? '')));
            if (mb_strlen($rawDesc) > 160) {
                $rawDesc = mb_substr($rawDesc, 0, 157) . '...';
            }
            if (empty($rawDesc)) {
                $rawDesc = 'Curated ' . $loc . ' beach homestay in Gokarna. Book direct with 20% hold reservation at ' . $priceFmt . '/night.';
            }
            $descText = htmlspecialchars($rawDesc, ENT_QUOTES, 'UTF-8');

            $imageUrl = 'https://coastaltrails.in/assets/real/gokarna-expedition.webp';
            if ($imgRow && !empty($imgRow['image_url'])) {
                $rawImg = $imgRow['image_url'];
                if (str_starts_with($rawImg, 'http')) {
                    $imageUrl = $rawImg;
                } else {
                    $imageUrl = 'https://coastaltrails.in' . (str_starts_with($rawImg, '/') ? '' : '/') . $rawImg;
                }
            }
            $pageUrl = 'https://coastaltrails.in/stay/' . urlencode($stayId);

            // Replace Page Title
            $html = preg_replace('/<title>.*?<\/title>/s', '<title>' . $titleText . '</title>', $html, 1);

            // Replace Canonical URL
            $html = preg_replace('/<link rel="canonical" href=".*?" \/>/', '<link rel="canonical" href="' . $pageUrl . '" />', $html, 1);

            // Replace Meta Description
            $html = preg_replace('/<meta\s+name="description"\s+content=".*?"\s*\/>/s', '<meta name="description" content="' . $descText . '" />', $html, 1);

            // Replace OpenGraph (Facebook, WhatsApp, Telegram, LinkedIn)
            $html = preg_replace('/<meta property="og:url" content=".*?" \/>/', '<meta property="og:url" content="' . $pageUrl . '" />', $html, 1);
            $html = preg_replace('/<meta property="og:title" content=".*?" \/>/', '<meta property="og:title" content="' . $titleText . '" />', $html, 1);
            $html = preg_replace('/<meta property="og:description" content=".*?" \/>/s', '<meta property="og:description" content="' . $descText . '" />', $html, 1);
            $html = preg_replace('/<meta property="og:image" content=".*?" \/>/', '<meta property="og:image" content="' . htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
            $html = preg_replace('/<meta property="og:image:secure_url" content=".*?" \/>/', '<meta property="og:image:secure_url" content="' . htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);

            // Replace Twitter Card
            $html = preg_replace('/<meta name="twitter:title" content=".*?" \/>/', '<meta name="twitter:title" content="' . $titleText . '" />', $html, 1);
            $html = preg_replace('/<meta name="twitter:description" content=".*?" \/>/s', '<meta name="twitter:description" content="' . $descText . '" />', $html, 1);
            $html = preg_replace('/<meta name="twitter:image" content=".*?" \/>/', '<meta name="twitter:image" content="' . htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);

            // Inject Stay LodgingBusiness JSON-LD Schema
            $staySchema = [
                '@context' => 'https://schema.org',
                '@type' => 'LodgingBusiness',
                '@id' => $pageUrl . '#stay',
                'name' => $stay['title'],
                'url' => $pageUrl,
                'image' => $imageUrl,
                'description' => $rawDesc,
                'priceRange' => $priceFmt,
                'currenciesAccepted' => 'INR',
                'paymentAccepted' => 'UPI, Credit Card, Debit Card, Net Banking',
                'address' => [
                    '@type' => 'PostalAddress',
                    'streetAddress' => $stay['location'],
                    'addressLocality' => 'Gokarna',
                    'addressRegion' => 'Karnataka',
                    'postalCode' => '581326',
                    'addressCountry' => 'IN'
                ],
                'geo' => [
                    '@type' => 'GeoCoordinates',
                    'latitude' => 14.5479,
                    'longitude' => 74.3188
                ],
                'offers' => [
                    '@type' => 'Offer',
                    'price' => (string)$stay['price_per_night'],
                    'priceCurrency' => 'INR',
                    'availability' => 'https://schema.org/InStock',
                    'url' => $pageUrl
                ]
            ];
            if (!empty($stay['rating']) && !empty($stay['reviews_count'])) {
                $staySchema['aggregateRating'] = [
                    '@type' => 'AggregateRating',
                    'ratingValue' => (string)$stay['rating'],
                    'reviewCount' => (string)$stay['reviews_count'],
                    'bestRating' => '5',
                    'worstRating' => '1'
                ];
            }
            $breadcrumbSchema = [
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => 'https://coastaltrails.in/'],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Gokarna Homestays', 'item' => 'https://coastaltrails.in/homestays'],
                    ['@type' => 'ListItem', 'position' => 3, 'name' => $loc, 'item' => 'https://coastaltrails.in/homestays/' . strtolower(str_replace(' ', '-', $loc))],
                    ['@type' => 'ListItem', 'position' => 4, 'name' => $stay['title'], 'item' => $pageUrl]
                ]
            ];
            $schemaJson = "\n    <script type=\"application/ld+json\">\n    " . json_encode($staySchema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n    </script>\n";
            $schemaJson .= "    <script type=\"application/ld+json\">\n    " . json_encode($breadcrumbSchema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n    </script>\n";
            $html = str_replace('</head>', $schemaJson . '</head>', $html);
        }
    } catch (\Throwable $e) {
        // Fall back gracefully to base index.html
    }
} else if ($path === '/trails') {
    $trailsTitle = 'The Gokarna Journal — 5-Beach Cliff Trek, Heritage Temples & Culture | Coastal Trails';
    $trailsDesc = 'Curated field guide to Gokarna: 5-beach cliff trek (Kudle to Paradise), Mahabaleshwar Atmalinga heritage, Yana caves, Mirjan Fort, and Karavali coastal etiquette.';
    $trailsUrl = 'https://coastaltrails.in/trails';
    $trailsImg = 'https://coastaltrails.in/assets/real/halfmoon-beach.webp';

    $html = preg_replace('/<title>.*?<\/title>/s', '<title>' . htmlspecialchars($trailsTitle, ENT_QUOTES, 'UTF-8') . '</title>', $html, 1);
    $html = preg_replace('/<link rel="canonical" href=".*?" \/>/', '<link rel="canonical" href="' . $trailsUrl . '" />', $html, 1);
    $html = preg_replace('/<meta\s+name="description"\s+content=".*?"\s*\/>/s', '<meta name="description" content="' . htmlspecialchars($trailsDesc, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:url" content=".*?" \/>/', '<meta property="og:url" content="' . $trailsUrl . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:title" content=".*?" \/>/', '<meta property="og:title" content="' . htmlspecialchars($trailsTitle, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:description" content=".*?" \/>/s', '<meta property="og:description" content="' . htmlspecialchars($trailsDesc, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:image" content=".*?" \/>/', '<meta property="og:image" content="' . $trailsImg . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:image:secure_url" content=".*?" \/>/', '<meta property="og:image:secure_url" content="' . $trailsImg . '" />', $html, 1);
}

$gokarnaFaqSchema = [
    '@context' => 'https://schema.org',
    '@type' => 'FAQPage',
    'mainEntity' => [
        [
            '@type' => 'Question',
            'name' => 'Which beach is the best to stay at in Gokarna?',
            'acceptedAnswer' => [
                '@type' => 'Answer',
                'text' => 'Kudle Beach is ideal for sunset lovers, yoga enthusiasts, and travelers wanting beachfront cafes with an easy 15-minute walk to town. Om Beach is best for adventure seekers and water sports. Half Moon and Paradise Beach offer secluded, off-grid tranquility with zero vehicular noise. Gokarna Main Beach is best for spiritual pilgrims visiting Mahabaleshwar Temple and beginners learning surfing.'
            ]
        ],
        [
            '@type' => 'Question',
            'name' => 'How does the 20% advance hold fee work on Coastal Trails?',
            'acceptedAnswer' => [
                '@type' => 'Answer',
                'text' => 'Coastal Trails requires only a 20% advance payment online via secure Razorpay checkout to instantly reserve and lock your room dates. The remaining 80% balance is paid directly to your homestay host upon check-in.'
            ]
        ],
        [
            '@type' => 'Question',
            'name' => 'Can you drive a car or two-wheeler directly to the homestays?',
            'acceptedAnswer' => [
                '@type' => 'Answer',
                'text' => 'Vehicles can access parking points at Kudle Beach hilltop, Om Beach main parking lot, and Gokarna Town. Half Moon Beach and Paradise Beach have no road access and can only be reached via scenic cliff trek or licensed ferry boats from Om Beach.'
            ]
        ],
        [
            '@type' => 'Question',
            'name' => 'What is the Gokarna 5-Beach Cliff Trek route and distance?',
            'acceptedAnswer' => [
                '@type' => 'Answer',
                'text' => 'The signature Gokarna 5-Beach Trek spans approximately 7.2 km along the Arabian Sea cliffline connecting Kudle Beach, Om Beach, Half Moon Beach, Paradise Beach, and Belekan Beach. It takes roughly 3 to 4 hours at an easy pace.'
            ]
        ],
        [
            '@type' => 'Question',
            'name' => 'Are Gokarna homestays safe for solo female travelers and families?',
            'acceptedAnswer' => [
                '@type' => 'Answer',
                'text' => 'Yes. All homestays on Coastal Trails are verified, family-run properties with on-site host families, verified WhatsApp support, lockable private cottages, and transparent local assistance.'
            ]
        ],
        [
            '@type' => 'Question',
            'name' => 'What is the best season to visit Gokarna for beach stays?',
            'acceptedAnswer' => [
                '@type' => 'Answer',
                'text' => 'The prime travel season is October through March when daytime temperatures hover around 28°C to 32°C with pleasant evenings, clear starry skies, and calm sea tides for swimming and boating.'
            ]
        ]
    ]
];

if (preg_match('#^/homestays/([a-zA-Z0-9\-]+)$#', $path, $matches)) {
    $slug = $matches[1];
    $clusterMeta = [
        'kudle-beach' => [
            'title' => 'Kudle Beach Homestays & Clifftop Wooden Cottages | Coastal Trails Gokarna',
            'desc' => 'Book curated Kudle Beach homestays and clifftop wooden cottages in Gokarna. Direct cliff path to sand, sunset decks, and 20% hold reservation.',
            'image' => 'https://coastaltrails.in/assets/real/kudle-beach.webp',
        ],
        'om-beach' => [
            'title' => 'Om Beach Cottages & Seaside Homestays | Coastal Trails Gokarna',
            'desc' => 'Explore authentic cottages and homestays near Om Beach, Gokarna. Watersports, Namaste Cafe trail, and 20% advance hold booking.',
            'image' => 'https://coastaltrails.in/assets/real/om-beach.webp',
        ],
        'half-moon-beach' => [
            'title' => 'Half Moon Beach Secluded Rock Cottages | Coastal Trails Gokarna',
            'desc' => 'Off-grid secluded rock cottages and tranquil homestays at Half Moon Beach, Gokarna. Bioluminescence views and peaceful cliff trails.',
            'image' => 'https://coastaltrails.in/assets/real/halfmoon-beach.webp',
        ],
        'paradise-beach' => [
            'title' => 'Paradise Beach Eco Cliff Pods & Secluded Stays | Coastal Trails Gokarna',
            'desc' => 'Stay at secluded Paradise Beach in Gokarna. Rustic eco cliff pods, stargazing camping, and tranquil nature away from all roads.',
            'image' => 'https://coastaltrails.in/assets/real/paradise-beach.webp',
        ],
        'main-beach' => [
            'title' => 'Main Beach & Temple Town Homestays | Coastal Trails Gokarna',
            'desc' => 'Curated coastal homestays near Gokarna Main Beach and Mahabaleshwar Temple. 5-min walk to morning darshan and surf schools.',
            'image' => 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Gokarna_temple_beach.JPG',
        ],
    ];

    if (isset($clusterMeta[$slug])) {
        $meta = $clusterMeta[$slug];
        $pageUrl = 'https://coastaltrails.in/homestays/' . $slug;
        $html = preg_replace('/<title>.*?<\/title>/s', '<title>' . htmlspecialchars($meta['title'], ENT_QUOTES, 'UTF-8') . '</title>', $html, 1);
        $html = preg_replace('/<link rel="canonical" href=".*?" \/>/', '<link rel="canonical" href="' . $pageUrl . '" />', $html, 1);
        $html = preg_replace('/<meta\s+name="description"\s+content=".*?"\s*\/>/s', '<meta name="description" content="' . htmlspecialchars($meta['desc'], ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
        $html = preg_replace('/<meta property="og:url" content=".*?" \/>/', '<meta property="og:url" content="' . $pageUrl . '" />', $html, 1);
        $html = preg_replace('/<meta property="og:title" content=".*?" \/>/', '<meta property="og:title" content="' . htmlspecialchars($meta['title'], ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
        $html = preg_replace('/<meta property="og:description" content=".*?" \/>/s', '<meta property="og:description" content="' . htmlspecialchars($meta['desc'], ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
        $html = preg_replace('/<meta property="og:image" content=".*?" \/>/', '<meta property="og:image" content="' . $meta['image'] . '" />', $html, 1);
        $html = preg_replace('/<meta property="og:image:secure_url" content=".*?" \/>/', '<meta property="og:image:secure_url" content="' . $meta['image'] . '" />', $html, 1);

        $breadcrumbSchema = [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => 'https://coastaltrails.in/'],
                ['@type' => 'ListItem', 'position' => 2, 'name' => 'Gokarna Homestays', 'item' => 'https://coastaltrails.in/homestays'],
                ['@type' => 'ListItem', 'position' => 3, 'name' => $meta['title'], 'item' => $pageUrl]
            ]
        ];
        $schemaJson = "\n    <script type=\"application/ld+json\">\n    " . json_encode($breadcrumbSchema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n    </script>\n";
        $schemaJson .= "    <script type=\"application/ld+json\">\n    " . json_encode($gokarnaFaqSchema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n    </script>\n";
        $html = str_replace('</head>', $schemaJson . '</head>', $html);
    }
} else if ($path === '/homestays') {
    $staysTitle = '12 Best Gokarna Homestays & Beach Cottages (2026) | Coastal Trails';
    $staysDesc = 'Browse curated family-run homestays, clifftop wooden cottages, and beachside rooms across Kudle, Om, and Half Moon Beach. 20% hold reservation.';
    $staysUrl = 'https://coastaltrails.in/homestays';

    $html = preg_replace('/<title>.*?<\/title>/s', '<title>' . htmlspecialchars($staysTitle, ENT_QUOTES, 'UTF-8') . '</title>', $html, 1);
    $html = preg_replace('/<link rel="canonical" href=".*?" \/>/', '<link rel="canonical" href="' . $staysUrl . '" />', $html, 1);
    $html = preg_replace('/<meta\s+name="description"\s+content=".*?"\s*\/>/s', '<meta name="description" content="' . htmlspecialchars($staysDesc, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:url" content=".*?" \/>/', '<meta property="og:url" content="' . $staysUrl . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:title" content=".*?" \/>/', '<meta property="og:title" content="' . htmlspecialchars($staysTitle, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:description" content=".*?" \/>/s', '<meta property="og:description" content="' . htmlspecialchars($staysDesc, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);

    $breadcrumbSchema = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => 'https://coastaltrails.in/'],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Gokarna Homestays', 'item' => $staysUrl]
        ]
    ];
    $schemaJson = "\n    <script type=\"application/ld+json\">\n    " . json_encode($breadcrumbSchema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n    </script>\n";
    $schemaJson .= "    <script type=\"application/ld+json\">\n    " . json_encode($gokarnaFaqSchema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n    </script>\n";
    $html = str_replace('</head>', $schemaJson . '</head>', $html);
}

// 3. Deliver rendered HTML
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, must-revalidate');
echo $html;
