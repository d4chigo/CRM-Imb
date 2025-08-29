require('dotenv').config({ path: '../.env' });

module.exports = {
  port: process.env.SERVER_PORT,
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
};