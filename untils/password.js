import { pool } from '../db.js';
import randompass from './rp.ts';

export async function generatePasswords(length, count, n, ss, userId) {
  const passwords = randompass(length, count, n, ss);

  const inserted = [];
  for (const pass of passwords) {
    const result = await pool.query(
      `INSERT INTO passwords (user_id, value, created_at)
       VALUES ($1, $2, NOW())
       RETURNING user_id, pw_id`,
      [userId, pass]
    );
    const row = result.rows[0];
    inserted.push(`${row.user_id}.${row.pw_id}`);
  }

  return inserted;
}

export async function getAllPasswords(userId) {
  const result = await pool.query(
    `SELECT user_id || '.' || pw_id AS id, value, created_at
     FROM passwords
     WHERE user_id = $1
     ORDER BY pw_id ASC`,
    [userId]
  );
  return result.rows;
}

export async function clearPasswords(userId) {
  await pool.query('DELETE FROM passwords WHERE user_id = $1', [userId]);
}

export async function getPasswordById(pwId, userId) {
  const result = await pool.query(
    `SELECT user_id || '.' || pw_id AS id, value, created_at
     FROM passwords
     WHERE pw_id = $1 AND user_id = $2`,
    [pwId, userId]
  );
  return result.rows[0];
}
