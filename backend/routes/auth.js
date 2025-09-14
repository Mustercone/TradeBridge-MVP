const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { runQuery, getQuery } = require('../config/database');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  company: Joi.string().max(100).optional(),
  phone: Joi.string().max(20).optional(),
  country: Joi.string().max(50).default('Nigeria')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { email, password, firstName, lastName, company, phone, country } = value;

    // Check if user already exists
    const existingUser = await getQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate UUID
    const userUuid = uuidv4();

    // Create user
    const result = await runQuery(
      `INSERT INTO users (uuid, email, password_hash, first_name, last_name, company, phone, country, verification_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userUuid, email, passwordHash, firstName, lastName, company, phone, country, 'pending']
    );

    // Create default wallet
    const walletUuid = uuidv4();
    await runQuery(
      'INSERT INTO wallets (uuid, user_id, currency, balance) VALUES (?, ?, ?, ?)',
      [walletUuid, result.id, 'USD', 0.00]
    );

    // Generate tokens
    const token = generateToken(result.id, email);
    const refreshToken = generateRefreshToken(result.id);

    // Store refresh token
    await runQuery(
      'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [result.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.id,
        uuid: userUuid,
        email,
        firstName,
        lastName,
        company,
        phone,
        country,
        verificationStatus: 'pending'
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { email, password } = value;

    // Find user
    const user = await getQuery(
      'SELECT id, uuid, email, password_hash, first_name, last_name, company, phone, country, verification_status, is_active FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    await runQuery(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Generate tokens
    const token = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    await runQuery(
      'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        phone: user.phone,
        country: user.country,
        verificationStatus: user.verification_status
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if session exists
    const session = await getQuery(
      'SELECT user_id FROM user_sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP',
      [refreshToken]
    );

    if (!session) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Get user info
    const user = await getQuery(
      'SELECT id, uuid, email, first_name, last_name, company, phone, country, verification_status FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id);

    // Update session
    await runQuery(
      'UPDATE user_sessions SET token_hash = ?, expires_at = ? WHERE user_id = ? AND token_hash = ?',
      [newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), user.id, refreshToken]
    );

    res.json({
      message: 'Token refreshed successfully',
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        phone: user.phone,
        country: user.country,
        verificationStatus: user.verification_status
      },
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove session
      await runQuery(
        'DELETE FROM user_sessions WHERE token_hash = ?',
        [refreshToken]
      );
    }

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Verify email (placeholder for email verification)
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    // In a real implementation, you would verify the code
    // For now, we'll just mark the user as verified
    await runQuery(
      'UPDATE users SET verification_status = ? WHERE email = ?',
      ['verified', email]
    );

    res.json({
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// Demo login (for testing)
router.post('/demo-login', async (req, res) => {
  try {
    const { email } = req.body;

    // Find or create demo user
    let user = await getQuery(
      'SELECT id, uuid, email, first_name, last_name, company, phone, country, verification_status FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      // Create demo user
      const userUuid = uuidv4();
      const passwordHash = await bcrypt.hash('demo123', 12);
      
      const result = await runQuery(
        `INSERT INTO users (uuid, email, password_hash, first_name, last_name, company, phone, country, verification_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userUuid, email, passwordHash, 'Demo', 'User', 'Demo Company', '+234-000-000-0000', 'Nigeria', 'verified']
      );

      // Create default wallet
      const walletUuid = uuidv4();
      await runQuery(
        'INSERT INTO wallets (uuid, user_id, currency, balance) VALUES (?, ?, ?, ?)',
        [walletUuid, result.id, 'USD', 10000.00]
      );

      user = {
        id: result.id,
        uuid: userUuid,
        email,
        first_name: 'Demo',
        last_name: 'User',
        company: 'Demo Company',
        phone: '+234-000-000-0000',
        country: 'Nigeria',
        verification_status: 'verified'
      };
    }

    // Generate tokens
    const token = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      message: 'Demo login successful',
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        phone: user.phone,
        country: user.country,
        verificationStatus: user.verification_status
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({
      error: 'Demo login failed',
      code: 'DEMO_LOGIN_ERROR'
    });
  }
});

module.exports = router;
