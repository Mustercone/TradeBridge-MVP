const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  company: Joi.string().max(100).optional(),
  phone: Joi.string().max(20).optional(),
  country: Joi.string().max(50).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await getQuery(
      `SELECT id, uuid, email, first_name, last_name, company, phone, country, 
              avatar_url, verification_status, bvn_verified, documents_uploaded,
              created_at, updated_at, last_login
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get wallet balance
    const wallet = await getQuery(
      'SELECT balance, currency FROM wallets WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        phone: user.phone,
        country: user.country,
        avatarUrl: user.avatar_url,
        verificationStatus: user.verification_status,
        bvnVerified: user.bvn_verified,
        documentsUploaded: user.documents_uploaded,
        wallet: wallet ? {
          balance: wallet.balance,
          currency: wallet.currency
        } : null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { firstName, lastName, company, phone, country } = value;

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (firstName) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (company !== undefined) {
      updates.push('company = ?');
      values.push(company);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (country) {
      updates.push('country = ?');
      values.push(country);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        code: 'NO_UPDATES'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.user.id);

    await runQuery(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated user
    const updatedUser = await getQuery(
      `SELECT id, uuid, email, first_name, last_name, company, phone, country, 
              avatar_url, verification_status, updated_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        uuid: updatedUser.uuid,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        company: updatedUser.company,
        phone: updatedUser.phone,
        country: updatedUser.country,
        avatarUrl: updatedUser.avatar_url,
        verificationStatus: updatedUser.verification_status,
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      code: 'UPDATE_ERROR'
    });
  }
});

// Upload avatar
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update user avatar URL
    await runQuery(
      'UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [avatarUrl, req.user.id]
    );

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: avatarUrl
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      error: 'Failed to upload avatar',
      code: 'UPLOAD_ERROR'
    });
  }
});

// Change password
router.put('/password', async (req, res) => {
  try {
    // Validate input
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { currentPassword, newPassword } = value;

    // Get current password hash
    const user = await getQuery(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await runQuery(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'PASSWORD_ERROR'
    });
  }
});

// Upload documents
router.post('/documents', upload.array('documents', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        code: 'NO_FILES'
      });
    }

    const uploadedDocuments = [];

    for (const file of req.files) {
      const documentUuid = uuidv4();
      const documentUrl = `/uploads/documents/${file.filename}`;

      // Save document record
      await runQuery(
        `INSERT INTO document_uploads (uuid, user_id, file_name, file_path, file_size, file_type, upload_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [documentUuid, req.user.id, file.originalname, documentUrl, file.size, file.mimetype, 'verification', 'uploaded']
      );

      uploadedDocuments.push({
        uuid: documentUuid,
        fileName: file.originalname,
        fileUrl: documentUrl,
        fileSize: file.size,
        fileType: file.mimetype
      });
    }

    // Update documents count
    const docCount = await getQuery(
      'SELECT COUNT(*) as count FROM document_uploads WHERE user_id = ? AND upload_type = ?',
      [req.user.id, 'verification']
    );

    await runQuery(
      'UPDATE users SET documents_uploaded = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [docCount.count, req.user.id]
    );

    res.json({
      message: 'Documents uploaded successfully',
      documents: uploadedDocuments,
      totalDocuments: docCount.count
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      error: 'Failed to upload documents',
      code: 'UPLOAD_ERROR'
    });
  }
});

// Get user documents
router.get('/documents', async (req, res) => {
  try {
    const documents = await allQuery(
      `SELECT uuid, file_name, file_path, file_size, file_type, upload_type, status, created_at
       FROM document_uploads WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      documents: documents.map(doc => ({
        uuid: doc.uuid,
        fileName: doc.file_name,
        fileUrl: doc.file_path,
        fileSize: doc.file_size,
        fileType: doc.file_type,
        uploadType: doc.upload_type,
        status: doc.status,
        uploadedAt: doc.created_at
      }))
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      error: 'Failed to get documents',
      code: 'DOCUMENTS_ERROR'
    });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    // Get trade agreements count
    const tradeAgreements = await getQuery(
      'SELECT COUNT(*) as count FROM trade_agreements WHERE user_id = ?',
      [req.user.id]
    );

    // Get shipments count
    const shipments = await getQuery(
      'SELECT COUNT(*) as count FROM shipments WHERE user_id = ?',
      [req.user.id]
    );

    // Get wallet balance
    const wallet = await getQuery(
      'SELECT balance, currency FROM wallets WHERE user_id = ?',
      [req.user.id]
    );

    // Get notifications count
    const notifications = await getQuery(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      stats: {
        tradeAgreements: tradeAgreements.count,
        shipments: shipments.count,
        walletBalance: wallet ? wallet.balance : 0,
        walletCurrency: wallet ? wallet.currency : 'USD',
        unreadNotifications: notifications.count
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      code: 'STATS_ERROR'
    });
  }
});

module.exports = router;
