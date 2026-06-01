const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  const data = JSON.parse(fs.readFileSync('/tmp/etab_export.json', 'utf8'));
  console.log('Loaded', data.length, 'establishments');

  // Read .env
  const envFile = fs.readFileSync('/var/www/harchive/backend/.env', 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  });

  const db = await mysql.createConnection({
    host: env.MYSQL_HOST || 'localhost',
    port: parseInt(env.MYSQL_PORT || '3306'),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE
  });

  // Clear existing and re-insert all
  await db.query('DELETE FROM etablissements_agrees');
  console.log('Cleared existing data');

  let inserted = 0;
  for (const row of data) {
    // Convert ISO dates to MySQL format
    for (const key of ['createdAt', 'updatedAt']) {
      if (row[key] && typeof row[key] === 'string') {
        row[key] = row[key].replace('T', ' ').replace('.000Z', '');
      }
    }
    const cols = Object.keys(row);
    const placeholders = cols.map(() => '?').join(',');
    const values = cols.map(c => row[c]);
    await db.query(
      `INSERT INTO etablissements_agrees (${cols.join(',')}) VALUES (${placeholders})`,
      values
    );
    inserted++;
  }

  const [count] = await db.query('SELECT COUNT(*) as cnt FROM etablissements_agrees');
  console.log('Inserted:', inserted);
  console.log('Total in DB:', count[0].cnt);
  await db.end();
  console.log('DONE');
})();
