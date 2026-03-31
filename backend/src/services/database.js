const Database = require('better-sqlite3');
const path = require('path');
const { createSchema } = require('../db/schema');

let db;

function getDatabase() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH
      ? path.resolve(process.env.DATABASE_PATH)
      : path.join(__dirname, '../../database.sqlite');

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    createSchema(db);
  }
  return db;
}

module.exports = { getDatabase };
