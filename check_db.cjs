const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('data/harchive.db');

db.serialize(() => {
  // Schema of structure tables
  db.all("SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('etablissement_facultes','etablissement_departements','etablissement_options','etablissement_orientations','promotions','photos')", (err, rows) => {
    console.log("=== SCHEMAS ===");
    if (err) { console.log("Error:", err.message); return; }
    rows.forEach(r => console.log(r.name + ":", r.sql));
  });

  // Photos table content
  db.all("SELECT * FROM photos", (err, rows) => {
    console.log("\n=== PHOTOS ===");
    if (err) { console.log("Error:", err.message); return; }
    console.log("Total:", rows.length);
    if (rows.length > 0) console.log("Columns:", Object.keys(rows[0]).join(', '));
  });

  // All users with roles
  db.all("SELECT id, email, role_archive, etablissement_id, etablissement_nom FROM users", (err, rows) => {
    console.log("\n=== ALL USERS ===");
    if (err) { console.log("Error:", err.message); return; }
    rows.forEach(r => console.log(JSON.stringify(r)));
  });
});

setTimeout(() => db.close(), 3000);
