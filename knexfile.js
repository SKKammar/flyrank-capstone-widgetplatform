require('dotenv').config();

const parsePgConnection = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    };
  }
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'flyrank_db',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
};

module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: { filename: process.env.DB_FILENAME || './dev.sqlite' },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.pragma('foreign_keys = ON');
        cb();
      }
    },
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' }
  },
  production: {
    client: 'pg',
    connection: parsePgConnection(),
    pool: {
      min: 2,
      max: 10
    },
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' }
  }
};
