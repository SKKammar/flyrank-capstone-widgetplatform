const authService = require('./auth.service');

async function register(req, res) {
  try {
    const { email, password } = req.body || {};
    const user = await authService.register(email, password);
    return res.status(201).json({ user });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    const token = await authService.login(email, password);
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

module.exports = {
  register,
  login
};
