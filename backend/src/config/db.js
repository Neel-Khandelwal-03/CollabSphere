const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.database.url,
  ssl: env.database.ssl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected error on idle Postgres client', err);
  process.exit(1);
});

/**
 * Run a single query against the pool.
 * @param {string} text SQL text with $1, $2... placeholders
 * @param {Array} params
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Get a dedicated client for running multiple statements in a transaction.
 * Caller MUST release the client when done.
 */
async function getClient() {
  return pool.connect();
}

/**
 * Run a callback inside a transaction, committing on success and
 * rolling back automatically if the callback throws.
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, getClient, withTransaction };
