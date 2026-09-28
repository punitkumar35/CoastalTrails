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

        $stmt = $pdo->prepare('SELECT id, title, subtitle, location, location_display, price_per_night, rating, reviews_count FROM homestays WHERE id = ? LIMIT 1');
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
            $descText = htmlspecialchars($rawDesc . ' Book direct with 20% hold reservation at ' . $priceFmt . '/night.', ENT_QUOTES, 'UTF-8');

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
                'address' => [
                    '@type' => 'PostalAddress',
                    'streetAddress' => $stay['location'],
                    'addressLocality' => 'Gokarna',
                    'addressRegion' => 'Karnataka',
                    'postalCode' => '581326',
                    'addressCountry' => 'IN'
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
            $schemaJson = "\n    <script type=\"application/ld+json\">\n    " . json_encode($staySchema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n    </script>\n";
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
} else if ($path === '/homestays') {
    $staysTitle = 'Curated Gokarna Homestays & Beach Cottages | Coastal Trails';
    $staysDesc = 'Browse curated family-run homestays, clifftop wooden cottages, and beachside rooms across Kudle, Om, and Half Moon Beach. 20% hold reservation.';
    $staysUrl = 'https://coastaltrails.in/homestays';

    $html = preg_replace('/<title>.*?<\/title>/s', '<title>' . htmlspecialchars($staysTitle, ENT_QUOTES, 'UTF-8') . '</title>', $html, 1);
    $html = preg_replace('/<link rel="canonical" href=".*?" \/>/', '<link rel="canonical" href="' . $staysUrl . '" />', $html, 1);
    $html = preg_replace('/<meta\s+name="description"\s+content=".*?"\s*\/>/s', '<meta name="description" content="' . htmlspecialchars($staysDesc, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:url" content=".*?" \/>/', '<meta property="og:url" content="' . $staysUrl . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:title" content=".*?" \/>/', '<meta property="og:title" content="' . htmlspecialchars($staysTitle, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
    $html = preg_replace('/<meta property="og:description" content=".*?" \/>/s', '<meta property="og:description" content="' . htmlspecialchars($staysDesc, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
}

// 3. Deliver rendered HTML
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, must-revalidate');
echo $html;
