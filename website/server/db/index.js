import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, 'schema.sql');

const DB_NAME = process.env.DB_NAME || 'coastal_trails';

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  // Keep DATE/DATETIME columns as 'YYYY-MM-DD[ HH:MM:SS]' strings,
  // matching what the web client and Flutter APK expect.
  dateStrings: true,
};

const pool = mysql.createPool({ ...connectionConfig, database: DB_NAME });

// Split a schema file into individual statements (comments are stripped first,
// so semicolons inside comments cannot break statements apart)
function splitStatements(sql) {
  const withoutComments = sql
    .split('\n')
    .map((line) => {
      const commentStart = line.indexOf('--');
      return commentStart >= 0 ? line.slice(0, commentStart) : line;
    })
    .join('\n');

  return withoutComments
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

// Lightweight migrations for databases created before a column existed
async function runMigrations() {
  const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'password_hash'");
  if (columns.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)');
    console.log('Migration applied: users.password_hash column added.');
  }

  const [listedColumns] = await pool.query("SHOW COLUMNS FROM homestays LIKE 'availability_listed'");
  if (listedColumns.length === 0) {
    await pool.query('ALTER TABLE homestays ADD COLUMN availability_listed TINYINT DEFAULT 0');
    // Every stay that already exists is treated as published so nothing breaks;
    // newly added listings stay unpublished until the admin lists availability.
    await pool.query('UPDATE homestays SET availability_listed = 1');
    console.log('Migration applied: homestays.availability_listed column added (existing stays marked as published).');
  }

  // Reviews CRUD upgrade: author link, timestamps, one-review-per-user rule
  const [reviewColumns] = await pool.query('SHOW COLUMNS FROM reviews');
  const reviewFields = reviewColumns.map((c) => c.Field);

  if (!reviewFields.includes('user_id')) {
    await pool.query('ALTER TABLE reviews ADD COLUMN user_id VARCHAR(64) NULL AFTER homestay_id');
    await pool.query(
      'ALTER TABLE reviews ADD CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'
    );
    console.log('Migration applied: reviews.user_id column added.');
  }

  if (!reviewFields.includes('updated_at')) {
    await pool.query(
      'ALTER TABLE reviews ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    );
    await pool.query('UPDATE reviews SET updated_at = created_at');
    console.log('Migration applied: reviews.updated_at column added.');
  }

  const createdAtColumn = reviewColumns.find((c) => c.Field === 'created_at');
  if (createdAtColumn && String(createdAtColumn.Type).toLowerCase() === 'date') {
    await pool.query('ALTER TABLE reviews MODIFY COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    console.log('Migration applied: reviews.created_at upgraded to DATETIME.');
  }

  const [reviewIndexes] = await pool.query("SHOW INDEX FROM reviews WHERE Key_name = 'uq_review_user_stay'");
  if (reviewIndexes.length === 0) {
    await pool.query('ALTER TABLE reviews ADD UNIQUE KEY uq_review_user_stay (homestay_id, user_id)');
    console.log('Migration applied: one review per user per stay enforced.');
  }

  // Admin dashboard (PMS room control) additions
  const [imageColumns] = await pool.query("SHOW COLUMNS FROM homestay_images LIKE 'category'");
  if (imageColumns.length === 0) {
    await pool.query("ALTER TABLE homestay_images ADD COLUMN category VARCHAR(32) DEFAULT 'general'");
    console.log('Migration applied: homestay_images.category column added.');
  }

  const [bookingColumns] = await pool.query("SHOW COLUMNS FROM bookings LIKE 'channel'");
  if (bookingColumns.length === 0) {
    await pool.query("ALTER TABLE bookings ADD COLUMN channel VARCHAR(64) DEFAULT 'Direct website'");
    console.log('Migration applied: bookings.channel column added.');
  }

  const [roomNumberColumns] = await pool.query("SHOW COLUMNS FROM bookings LIKE 'room_number'");
  if (roomNumberColumns.length === 0) {
    await pool.query('ALTER TABLE bookings ADD COLUMN room_number INT NULL');
    console.log('Migration applied: bookings.room_number column added.');
  }

  // Bookings belong to an authenticated user (not just a name/phone typed in the browser)
  const [bookingUserColumns] = await pool.query("SHOW COLUMNS FROM bookings LIKE 'user_id'");
  if (bookingUserColumns.length === 0) {
    await pool.query('ALTER TABLE bookings ADD COLUMN user_id VARCHAR(64) NULL AFTER homestay_id');
    await pool.query(
      'ALTER TABLE bookings ADD CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'
    );
    const [backfill] = await pool.query(
      'UPDATE bookings b JOIN users u ON u.phone = b.user_phone SET b.user_id = u.id WHERE b.user_id IS NULL'
    );
    console.log(`Migration applied: bookings.user_id added (linked ${backfill.affectedRows} existing bookings).`);
  }

  const [reviewBookingColumns] = await pool.query("SHOW COLUMNS FROM reviews LIKE 'booking_id'");
  if (reviewBookingColumns.length === 0) {
    await pool.query('ALTER TABLE reviews ADD COLUMN booking_id VARCHAR(64) NULL AFTER user_id');
    await pool.query(
      'ALTER TABLE reviews ADD CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL'
    );
    console.log('Migration applied: reviews.booking_id column added.');
  }

  // Google OAuth support: google_id, avatar_url, and nullable phone
  const [googleColumns] = await pool.query("SHOW COLUMNS FROM users LIKE 'google_id'");
  if (googleColumns.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(128) NULL, ADD COLUMN avatar_url VARCHAR(512) NULL');
    await pool.query('ALTER TABLE users ADD INDEX idx_users_google (google_id)');
    console.log('Migration applied: users.google_id and avatar_url added.');
  }

  try {
    await pool.query('ALTER TABLE users MODIFY COLUMN phone VARCHAR(32) NULL');
  } catch (e) {}

  // Payment state is tracked separately from the reservation state
  const [paymentColumns] = await pool.query("SHOW COLUMNS FROM bookings LIKE 'payment_status'");
  if (paymentColumns.length === 0) {
    await pool.query("ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending' AFTER status");
    await pool.query('ALTER TABLE bookings ADD COLUMN payment_id VARCHAR(120) NULL AFTER payment_status');
    await pool.query('ALTER TABLE bookings ADD COLUMN paid_at DATETIME NULL AFTER payment_id');
    await pool.query(
      "UPDATE bookings SET payment_status = CASE WHEN advance_paid > 0 THEN 'paid' ELSE 'pending' END, paid_at = CASE WHEN advance_paid > 0 THEN created_at ELSE NULL END"
    );
    await pool.query(
      "UPDATE bookings SET payment_status = 'refunded' WHERE status IN ('cancelled','declined','expired') AND advance_paid > 0"
    );
    console.log('Migration applied: bookings payment columns added (existing paid bookings preserved).');
  }

  // Owner portal listing state (Homestay-list app)
  const [stayStatusColumns] = await pool.query("SHOW COLUMNS FROM homestays LIKE 'status'");
  if (stayStatusColumns.length === 0) {
    await pool.query("ALTER TABLE homestays ADD COLUMN status VARCHAR(16) DEFAULT 'live'");
    await pool.query('ALTER TABLE homestays ADD COLUMN instant_booking TINYINT DEFAULT 1');
    console.log('Migration applied: homestays.status + instant_booking columns added.');
  }
}

// Create the database if missing, then apply the schema
export async function initDatabase() {
  const bootstrap = await mysql.createConnection({
    host: connectionConfig.host,
    port: connectionConfig.port,
    user: connectionConfig.user,
    password: connectionConfig.password,
  });
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  for (const statement of splitStatements(schema)) {
    await pool.query(statement);
  }

  await runMigrations();
  // Availability is computed live from real bookings, so any legacy/demo calendar
  // blocks (reason 'booking' or 'booking:REF') are removed.
  const [cleanup] = await pool.query(
    "DELETE FROM room_unavailability WHERE reason = 'booking' OR reason LIKE 'booking:%'"
  );
  if (cleanup.affectedRows > 0) {
    console.log(`Removed ${cleanup.affectedRows} fake/legacy booking date blocks.`);
  }
  console.log(`Database schema successfully verified/initialized (MySQL: ${DB_NAME}).`);
}

// Async query wrappers
export async function all(query, params = []) {
  const [rows] = await pool.query(query, params);
  return rows;
}

export async function get(query, params = []) {
  const [rows] = await pool.query(query, params);
  return rows[0];
}

export async function run(query, params = []) {
  const [result] = await pool.query(query, params);
  return { lastID: result.insertId, changes: result.affectedRows };
}

export default pool;
