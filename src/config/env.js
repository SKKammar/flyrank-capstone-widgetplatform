require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'your_super_secret_key_change_this',
  DB_FILENAME: process.env.DB_FILENAME || './dev.sqlite',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
