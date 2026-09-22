-- Gokarna Connect Shared Database Schema (MySQL 8+)
-- Shared between Flutter Mobile APK and Web Portal

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    phone VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190),
    password_hash VARCHAR(255), -- bcrypt hash; never store plain-text passwords
    role VARCHAR(32) DEFAULT 'traveler', -- 'traveler', 'host', 'admin'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Homestays Master Table
CREATE TABLE IF NOT EXISTS homestays (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(190) NOT NULL,
    subtitle VARCHAR(255) NOT NULL,
    location VARCHAR(32) NOT NULL, -- 'kudle', 'om', 'mainBeach', 'halfMoon', 'paradise', 'town'
    location_display VARCHAR(120) NOT NULL,
    price_per_night DOUBLE NOT NULL,
    rating DOUBLE DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    host_name VARCHAR(120) NOT NULL,
    host_whatsapp VARCHAR(32) NOT NULL,
    is_host_verified TINYINT DEFAULT 1,
    walking_minutes_to_beach INT DEFAULT 3,
    total_rooms INT DEFAULT 3,
    availability_listed TINYINT DEFAULT 0, -- 1 once the admin publishes room availability
    status VARCHAR(16) DEFAULT 'live', -- 'live' | 'hidden' (owner portal listing state)
    instant_booking TINYINT DEFAULT 1, -- owner portal: allow instant booking vs request-only
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Homestay Images
CREATE TABLE IF NOT EXISTS homestay_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    homestay_id VARCHAR(64) NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    sort_order INT DEFAULT 0,
    category VARCHAR(32) DEFAULT 'general', -- admin dashboard image tagging
    CONSTRAINT fk_images_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Homestay Amenities
CREATE TABLE IF NOT EXISTS homestay_amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    homestay_id VARCHAR(64) NOT NULL,
    amenity VARCHAR(190) NOT NULL,
    CONSTRAINT fk_amenities_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Homestay Verified Badges
CREATE TABLE IF NOT EXISTS homestay_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    homestay_id VARCHAR(64) NOT NULL,
    badge VARCHAR(120) NOT NULL,
    CONSTRAINT fk_badges_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Room Unavailability (Booked / Host-Blocked dates)
CREATE TABLE IF NOT EXISTS room_unavailability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    homestay_id VARCHAR(64) NOT NULL,
    blocked_date DATE NOT NULL, -- Format: YYYY-MM-DD
    reason VARCHAR(120) DEFAULT 'booking', -- 'booking', 'maintenance', 'host_hold'
    CONSTRAINT fk_unavailability_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id) ON DELETE CASCADE,
    UNIQUE KEY uq_stay_date (homestay_id, blocked_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6b. Per-Room Status Overrides (admin control center)
CREATE TABLE IF NOT EXISTS room_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    homestay_id VARCHAR(64) NOT NULL,
    room_number INT NOT NULL,
    date DATE NOT NULL, -- YYYY-MM-DD
    status VARCHAR(16) NOT NULL DEFAULT 'available', -- 'available', 'maintenance', 'blocked'
    reason VARCHAR(190),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_room_status (homestay_id, room_number, date),
    CONSTRAINT fk_room_status_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6c. Per-Room State (housekeeping, bed setup, capacity, photo)
CREATE TABLE IF NOT EXISTS room_state (
    homestay_id VARCHAR(64) NOT NULL,
    room_number INT NOT NULL,
    name VARCHAR(120),
    bed_type VARCHAR(60) DEFAULT 'King Bed',
    capacity INT DEFAULT 2,
    housekeeping VARCHAR(16) DEFAULT 'clean', -- 'clean', 'dirty', 'inspecting'
    photo VARCHAR(512),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (homestay_id, room_number),
    CONSTRAINT fk_room_state_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6d. Stay-Level Settings (min stay, festival price override)
CREATE TABLE IF NOT EXISTS stay_settings (
    homestay_id VARCHAR(64) PRIMARY KEY,
    min_stay INT DEFAULT 1,
    price_override DOUBLE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stay_settings_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bookings Table (Shared with 20% Advance / 80% Check-in Model)
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(64) PRIMARY KEY,
    reference_code VARCHAR(32) UNIQUE NOT NULL,
    homestay_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64), -- authenticated traveler who booked (null for offline walk-ins)
    user_name VARCHAR(120) NOT NULL,
    user_phone VARCHAR(32) NOT NULL,
    check_in DATE NOT NULL, -- YYYY-MM-DD
    check_out DATE NOT NULL, -- YYYY-MM-DD
    guests_count INT DEFAULT 1,
    total_amount DOUBLE NOT NULL,
    advance_paid DOUBLE NOT NULL,
    balance_payable_at_property DOUBLE NOT NULL,
    status VARCHAR(32) DEFAULT 'pending_payment', -- 'pending_payment','awaiting_host','confirmed','checked_in','completed','declined','cancelled','expired'
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending','paid','failed','partially_paid','refunded'
    payment_id VARCHAR(120), -- provider reference once paid
    paid_at DATETIME,
    channel VARCHAR(64) DEFAULT 'Direct website', -- admin dashboard booking channel
    room_number INT, -- persistent room assignment
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    hold_expires_at DATETIME,
    INDEX idx_bookings_phone (user_phone),
    INDEX idx_bookings_homestay (homestay_id),
    CONSTRAINT fk_bookings_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Guest Reviews (CRUD: owner = logged-in user, one review per stay)
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    homestay_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NULL, -- author (null for seeded/legacy reviews)
    booking_id VARCHAR(64) NULL, -- completed stay this review belongs to
    guest_name VARCHAR(120) NOT NULL, -- display fallback for seeded reviews
    rating TINYINT NOT NULL,
    title VARCHAR(190) NOT NULL,
    body TEXT NOT NULL,
    stay_details VARCHAR(190), -- e.g. '2 guests · September 2026'
    verified TINYINT DEFAULT 1,
    helpful_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reviews_stay (homestay_id),
    UNIQUE KEY uq_review_user_stay (homestay_id, user_id),
    CONSTRAINT fk_reviews_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Login sessions (API tokens for authenticated CRUD actions)
CREATE TABLE IF NOT EXISTS sessions (
    token CHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    INDEX idx_sessions_user (user_id),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Review media (guest photos & videos)
CREATE TABLE IF NOT EXISTS review_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    media_url VARCHAR(512) NOT NULL,
    media_type VARCHAR(16) NOT NULL DEFAULT 'image', -- 'image' | 'video'
    CONSTRAINT fk_media_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Transit Routes (For Figma Screen 3 Navigator)
CREATE TABLE IF NOT EXISTS transit_routes (
    id VARCHAR(64) PRIMARY KEY,
    start_point VARCHAR(190) NOT NULL,
    start_subtext VARCHAR(255) NOT NULL,
    destination VARCHAR(190) NOT NULL,
    destination_subtext VARCHAR(255) NOT NULL,
    distance_km DOUBLE NOT NULL,
    walking_mins INT NOT NULL,
    scooter_mins INT NOT NULL,
    car_mins INT NOT NULL,
    bus_mins INT NOT NULL,
    active_mode VARCHAR(32) DEFAULT 'scooter'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Payments (gateway records, kept separate from booking status)
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL,
    amount DOUBLE NOT NULL,
    method VARCHAR(32) DEFAULT 'upi', -- 'upi','card','netbanking','cash'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending','paid','failed','refunded'
    provider VARCHAR(32) DEFAULT 'mock',
    provider_ref VARCHAR(120),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    refunded_at DATETIME,
    INDEX idx_payments_booking (booking_id),
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Enclaves (admin dashboard location grouping)
CREATE TABLE IF NOT EXISTS enclaves (
    id VARCHAR(64) PRIMARY KEY,
    label VARCHAR(120) NOT NULL,
    sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
