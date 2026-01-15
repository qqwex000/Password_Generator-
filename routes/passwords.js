import express from 'express';
import { pool } from '../db.js';
import randompass from '../utils/rp.ts';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { length, count, n, ss } = req.body;
    const passwords = randompass(Number(length), Number(count), n ? 1 : 0, ss ? 1 : 0);

    for (const pass of passwords) {
      await pool.query(
        `INSERT INTO passwords (user_id, value, created_at)
         VALUES ($1, $2, NOW())`,
        [req.user.id, pass]
      );
    }

    res.json({ passwords }); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler bei der Generierung' });
  }
});

router.post('/save', async (req, res) => {
  try {
    const { passwords } = req.body;
    if (!Array.isArray(passwords) || passwords.length === 0) {
      return res.status(400).json({ error: 'Keine Passwörter gesendet' });
    }
    const inserted = [];
    for (const pw of passwords) {
      const result = await pool.query(
        `INSERT INTO passwords (user_id, value, created_at)
         VALUES ($1, $2, NOW())
         RETURNING user_id, pw_id`,
        [req.user.id, pw]
      );
      const row = result.rows[0];
      inserted.push(`${row.user_id}.${row.pw_id}`);
    }
    

    res.json({ message: 'Passwörter gespeichert!', ids: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id || '.' || pw_id AS id, value, created_at
       FROM passwords
       WHERE user_id = $1
       ORDER BY pw_id ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

router.delete('/reset', async (req, res) => {
  try {
    await pool.query('DELETE FROM passwords WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Alle Passwörter gelöscht' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const format = (req.query.format || 'json').toLowerCase();
    const [userId, pwId] = id.split('.');
    const result = await pool.query(
      `SELECT user_id || '.' || pw_id AS id, value, created_at
       FROM passwords
       WHERE user_id = $1 AND pw_id = $2`,
      [userId, pwId]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(row, null, 2));
    }
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      return res.send(`id,created_at,value\n${row.id},"${row.created_at}","${row.value}"`);
    }
    return res.status(400).json({ error: 'Ungültiges Format' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Download' });
  }
});

export default router;
