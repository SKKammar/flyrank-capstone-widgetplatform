const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/db');
const env = require('../../config/env');

async function register(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db('users').where({ email: normalizedEmail }).first();
  if (existing) {
    throw new Error('Email already in use');
  }

  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);
  const id = uuidv4();

  const [createdUser] = await db('users')
    .insert({
      id,
      email: normalizedEmail,
      password_hash
    })
    .returning(['id', 'email', 'created_at']);

  // If returning is not fully supported by SQLite or returns count/empty, fetch user
  if (!createdUser) {
    const user = await db('users').where({ id }).first();
    const { password_hash: _, ...safeUser } = user;
    return safeUser;
  }

  const { password_hash: _, ...safeUser } = createdUser;
  return safeUser;
}

async function login(email, password) {
  if (!email || !password) {
    throw new Error('Invalid credentials');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await db('users').where({ email: normalizedEmail }).first();
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return token;
}

module.exports = {
  register,
  login
};
