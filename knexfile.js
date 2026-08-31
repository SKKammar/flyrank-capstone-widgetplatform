require('dotenv').config();

module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: { filename: process.env.DB_FILENAME || './dev.sqlite' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' }
  }
};
