import express from 'express';
import { all, get, run } from '../db/index.js';
import { seed } from '../db/seed.js';

const router = express.Router();

// GET /api/db/stats - High-level counts
router.get('/stats', async (req, res) => {
  try {
    const homestaysCount = await get('SELECT COUNT(*) as count FROM homestays');
    const bookingsCount = await get('SELECT COUNT(*) as count FROM bookings');
    const usersCount = await get('SELECT COUNT(*) as count FROM users');
    const blockedDatesCount = await get('SELECT COUNT(*) as count FROM room_unavailability');

    res.json({
      homestays: homestaysCount.count,
      bookings: bookingsCount.count,
      users: usersCount.count,
      blockedDates: blockedDatesCount.count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Map MySQL SHOW COLUMNS output to the shape the Studio UI expects
function mapColumns(columns) {
  return columns.map((c, i) => ({
    cid: i,
    name: c.Field,
    type: c.Type,
    notnull: c.Null === 'NO',
    dflt_value: c.Default,
    pk: c.Key === 'PRI',
  }));
}

// GET /api/db/tables - List all tables and column metadata
router.get('/tables', async (req, res) => {
  try {
    const tables = await all(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
    );
    const result = [];

    for (const t of tables) {
      const columns = await all(`SHOW COLUMNS FROM \`${t.name}\``);
      const count = await get(`SELECT COUNT(*) as count FROM \`${t.name}\``);
      result.push({
        name: t.name,
        count: count.count,
        columns: mapColumns(columns)
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/db/table/:name - Fetch all rows from a table
router.get('/table/:name', async (req, res) => {
  try {
    const { name } = req.params;
    // Prevent SQL injection by verifying table name against information_schema
    const tableExists = await get(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [name]
    );
    if (!tableExists) {
      return res.status(404).json({ error: `Table '${name}' not found` });
    }

    const rows = await all(`SELECT * FROM \`${name}\` LIMIT 100`);
    const columns = await all(`SHOW COLUMNS FROM \`${name}\``);

    res.json({
      table: name,
      columns: mapColumns(columns),
      rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/db/query - Execute custom query (Admin / Studio exploration)
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Missing SQL query' });

    const trimmed = query.trim().toUpperCase();
    if (
      trimmed.startsWith('SELECT') ||
      trimmed.startsWith('SHOW') ||
      trimmed.startsWith('DESCRIBE') ||
      trimmed.startsWith('EXPLAIN')
    ) {
      const rows = await all(query);
      res.json({ type: 'SELECT', rows });
    } else {
      const result = await run(query);
      res.json({ type: 'EXEC', result });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/db/reset - Reseed database to default state
router.post('/reset', async (req, res) => {
  try {
    await seed();
    res.json({ success: true, message: 'Database reset and reseeded with default Gokarna records' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
