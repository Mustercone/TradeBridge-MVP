const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// Validation schemas
const createNotificationSchema = Joi.object({
  type: Joi.string().valid('trade', 'shipment', 'payment', 'system', 'invoice').required(),
  title: Joi.string().min(3).max(100).required(),
  message: Joi.string().min(10).max(500).required(),
  metadata: Joi.object().optional()
});

// Get all notifications for user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, unreadOnly } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = ?';
    let queryParams = [req.user.id];

    // Add type filter
    if (type) {
      whereClause += ' AND type = ?';
      queryParams.push(type);
    }

    // Add unread filter
    if (unreadOnly === 'true') {
      whereClause += ' AND is_read = 0';
    }

    // Get notifications
    const notifications = await allQuery(
      `SELECT * FROM notifications ${whereClause} 
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    // Get total count
    const totalResult = await getQuery(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      queryParams
    );

    // Get unread count
    const unreadResult = await getQuery(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      notifications: notifications.map(notification => ({
        id: notification.id,
        uuid: notification.uuid,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.is_read === 1,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
        createdAt: notification.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      },
      unreadCount: unreadResult.unread
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Failed to get notifications',
      code: 'GET_ERROR'
    });
  }
});

// Get single notification
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await getQuery(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      notification: {
        id: notification.id,
        uuid: notification.uuid,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.is_read === 1,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
        createdAt: notification.created_at
      }
    });

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      error: 'Failed to get notification',
      code: 'GET_ERROR'
    });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if notification exists
    const notification = await getQuery(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found',
        code: 'NOT_FOUND'
      });
    }

    // Mark as read
    await runQuery(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      code: 'UPDATE_ERROR'
    });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    await runQuery(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      code: 'UPDATE_ERROR'
    });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if notification exists
    const notification = await getQuery(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found',
        code: 'NOT_FOUND'
      });
    }

    // Delete notification
    await runQuery(
      'DELETE FROM notifications WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      code: 'DELETE_ERROR'
    });
  }
});

// Delete all notifications
router.delete('/', async (req, res) => {
  try {
    await runQuery(
      'DELETE FROM notifications WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      message: 'All notifications deleted successfully'
    });

  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({
      error: 'Failed to delete all notifications',
      code: 'DELETE_ERROR'
    });
  }
});

// Create notification (for testing/admin purposes)
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = createNotificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { type, title, message, metadata } = value;

    const notificationUuid = uuidv4();

    // Create notification
    const result = await runQuery(
      `INSERT INTO notifications 
       (uuid, user_id, type, title, message, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        notificationUuid, req.user.id, type, title, message,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    // Get created notification
    const notification = await getQuery(
      'SELECT * FROM notifications WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'Notification created successfully',
      notification: {
        id: notification.id,
        uuid: notification.uuid,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.is_read === 1,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
        createdAt: notification.created_at
      }
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      error: 'Failed to create notification',
      code: 'CREATE_ERROR'
    });
  }
});

// Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total notifications count
    const totalResult = await getQuery(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [req.user.id]
    );

    // Get unread notifications count
    const unreadResult = await getQuery(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    // Get notifications count by type
    const typeStats = await allQuery(
      `SELECT type, COUNT(*) as count 
       FROM notifications WHERE user_id = ? 
       GROUP BY type`,
      [req.user.id]
    );

    // Get recent notifications (last 7 days)
    const recentResult = await getQuery(
      `SELECT COUNT(*) as recent 
       FROM notifications 
       WHERE user_id = ? AND created_at >= datetime('now', '-7 days')`,
      [req.user.id]
    );

    res.json({
      stats: {
        total: totalResult.total,
        unread: unreadResult.unread,
        recent: recentResult.recent,
        byType: typeStats.reduce((acc, stat) => {
          acc[stat.type] = stat.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      error: 'Failed to get notification statistics',
      code: 'STATS_ERROR'
    });
  }
});

module.exports = router;
