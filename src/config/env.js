require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET || 'fallback_default_weak_key_needs_32_chars_or_more';

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: jwtSecret,
  DB_FILENAME: process.env.DB_FILENAME || './dev.sqlite',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
