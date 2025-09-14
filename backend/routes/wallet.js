const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// Validation schemas
const createTransactionSchema = Joi.object({
  type: Joi.string().valid('credit', 'debit', 'transfer', 'payment').required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('USD'),
  description: Joi.string().max(200).optional(),
  reference: Joi.string().max(100).optional(),
  metadata: Joi.object().optional()
});

const transferSchema = Joi.object({
  recipientEmail: Joi.string().email().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('USD'),
  description: Joi.string().max(200).optional()
});

// Get wallet balance
router.get('/balance', async (req, res) => {
  try {
    const wallet = await getQuery(
      'SELECT * FROM wallets WHERE user_id = ?',
      [req.user.id]
    );

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found',
        code: 'WALLET_NOT_FOUND'
      });
    }

    res.json({
      wallet: {
        id: wallet.id,
        uuid: wallet.uuid,
        currency: wallet.currency,
        balance: wallet.balance,
        frozenBalance: wallet.frozen_balance,
        availableBalance: wallet.balance - wallet.frozen_balance,
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }
    });

  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      error: 'Failed to get wallet balance',
      code: 'BALANCE_ERROR'
    });
  }
});

// Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, currency } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE t.user_id = ?';
    let queryParams = [req.user.id];

    // Add type filter
    if (type) {
      whereClause += ' AND t.type = ?';
      queryParams.push(type);
    }

    // Add currency filter
    if (currency) {
      whereClause += ' AND t.currency = ?';
      queryParams.push(currency);
    }

    // Get transactions
    const transactions = await allQuery(
      `SELECT t.*, w.currency as wallet_currency 
       FROM transactions t 
       JOIN wallets w ON t.wallet_id = w.id 
       ${whereClause} 
       ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    // Get total count
    const totalResult = await getQuery(
      `SELECT COUNT(*) as total FROM transactions t 
       JOIN wallets w ON t.wallet_id = w.id 
       ${whereClause}`,
      queryParams
    );

    res.json({
      transactions: transactions.map(transaction => ({
        id: transaction.id,
        uuid: transaction.uuid,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        reference: transaction.reference,
        status: transaction.status,
        metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null,
        createdAt: transaction.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Failed to get transactions',
      code: 'TRANSACTIONS_ERROR'
    });
  }
});

// Create transaction
router.post('/transactions', async (req, res) => {
  try {
    // Validate input
    const { error, value } = createTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { type, amount, currency, description, reference, metadata } = value;

    // Get user's wallet
    const wallet = await getQuery(
      'SELECT * FROM wallets WHERE user_id = ?',
      [req.user.id]
    );

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found',
        code: 'WALLET_NOT_FOUND'
      });
    }

    // Check sufficient balance for debit transactions
    if (type === 'debit' || type === 'transfer' || type === 'payment') {
      const availableBalance = wallet.balance - wallet.frozen_balance;
      if (availableBalance < amount) {
        return res.status(400).json({
          error: 'Insufficient balance',
          code: 'INSUFFICIENT_BALANCE',
          availableBalance: availableBalance
        });
      }
    }

    const transactionUuid = uuidv4();

    // Create transaction
    const result = await runQuery(
      `INSERT INTO transactions 
       (uuid, wallet_id, user_id, type, amount, currency, description, reference, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionUuid, wallet.id, req.user.id, type, amount, currency,
        description, reference, 'pending', metadata ? JSON.stringify(metadata) : null
      ]
    );

    // Update wallet balance
    let newBalance = wallet.balance;
    if (type === 'credit') {
      newBalance += amount;
    } else if (type === 'debit' || type === 'transfer' || type === 'payment') {
      newBalance -= amount;
    }

    await runQuery(
      'UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newBalance, wallet.id]
    );

    // Update transaction status to completed
    await runQuery(
      'UPDATE transactions SET status = ? WHERE id = ?',
      ['completed', result.id]
    );

    // Get created transaction
    const transaction = await getQuery(
      'SELECT * FROM transactions WHERE id = ?',
      [result.id]
    );

    // Create notification
    await runQuery(
      `INSERT INTO notifications (uuid, user_id, type, title, message, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), req.user.id, 'payment',
        'Transaction Completed',
        `${type.charAt(0).toUpperCase() + type.slice(1)} transaction of ${currency} ${amount} completed`,
        JSON.stringify({ transactionId: transaction.id, transactionUuid, type, amount, currency })
      ]
    );

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: {
        id: transaction.id,
        uuid: transaction.uuid,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        reference: transaction.reference,
        status: transaction.status,
        metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null,
        createdAt: transaction.created_at
      },
      newBalance: newBalance
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      error: 'Failed to create transaction',
      code: 'CREATE_ERROR'
    });
  }
});

// Transfer funds to another user
router.post('/transfer', async (req, res) => {
  try {
    // Validate input
    const { error, value } = transferSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { recipientEmail, amount, currency, description } = value;

    // Get sender's wallet
    const senderWallet = await getQuery(
      'SELECT * FROM wallets WHERE user_id = ?',
      [req.user.id]
    );

    if (!senderWallet) {
      return res.status(404).json({
        error: 'Sender wallet not found',
        code: 'SENDER_WALLET_NOT_FOUND'
      });
    }

    // Check sufficient balance
    const availableBalance = senderWallet.balance - senderWallet.frozen_balance;
    if (availableBalance < amount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        code: 'INSUFFICIENT_BALANCE',
        availableBalance: availableBalance
      });
    }

    // Find recipient user
    const recipient = await getQuery(
      'SELECT id, uuid, email, first_name, last_name FROM users WHERE email = ? AND is_active = 1',
      [recipientEmail]
    );

    if (!recipient) {
      return res.status(404).json({
        error: 'Recipient not found',
        code: 'RECIPIENT_NOT_FOUND'
      });
    }

    // Get recipient's wallet
    const recipientWallet = await getQuery(
      'SELECT * FROM wallets WHERE user_id = ?',
      [recipient.id]
    );

    if (!recipientWallet) {
      return res.status(404).json({
        error: 'Recipient wallet not found',
        code: 'RECIPIENT_WALLET_NOT_FOUND'
      });
    }

    const transferUuid = uuidv4();

    // Create debit transaction for sender
    const senderTransaction = await runQuery(
      `INSERT INTO transactions 
       (uuid, wallet_id, user_id, type, amount, currency, description, reference, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), senderWallet.id, req.user.id, 'transfer', amount, currency,
        `Transfer to ${recipientEmail}`, transferUuid, 'completed',
        JSON.stringify({ recipientEmail, recipientId: recipient.id, transferType: 'outgoing' })
      ]
    );

    // Create credit transaction for recipient
    const recipientTransaction = await runQuery(
      `INSERT INTO transactions 
       (uuid, wallet_id, user_id, type, amount, currency, description, reference, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), recipientWallet.id, recipient.id, 'credit', amount, currency,
        `Transfer from ${req.user.email}`, transferUuid, 'completed',
        JSON.stringify({ senderEmail: req.user.email, senderId: req.user.id, transferType: 'incoming' })
      ]
    );

    // Update sender's wallet balance
    await runQuery(
      'UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [senderWallet.balance - amount, senderWallet.id]
    );

    // Update recipient's wallet balance
    await runQuery(
      'UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [recipientWallet.balance + amount, recipientWallet.id]
    );

    // Create notifications
    await runQuery(
      `INSERT INTO notifications (uuid, user_id, type, title, message, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), req.user.id, 'payment',
        'Transfer Sent',
        `Transfer of ${currency} ${amount} sent to ${recipientEmail}`,
        JSON.stringify({ transactionId: senderTransaction.id, transferUuid, amount, currency })
      ]
    );

    await runQuery(
      `INSERT INTO notifications (uuid, user_id, type, title, message, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), recipient.id, 'payment',
        'Transfer Received',
        `Transfer of ${currency} ${amount} received from ${req.user.email}`,
        JSON.stringify({ transactionId: recipientTransaction.id, transferUuid, amount, currency })
      ]
    );

    res.json({
      message: 'Transfer completed successfully',
      transfer: {
        uuid: transferUuid,
        amount: amount,
        currency: currency,
        recipientEmail: recipientEmail,
        recipientName: `${recipient.first_name} ${recipient.last_name}`,
        description: description
      },
      newBalance: senderWallet.balance - amount
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      error: 'Failed to process transfer',
      code: 'TRANSFER_ERROR'
    });
  }
});

// Get transaction by ID
router.get('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await getQuery(
      `SELECT t.*, w.currency as wallet_currency 
       FROM transactions t 
       JOIN wallets w ON t.wallet_id = w.id 
       WHERE t.id = ? AND t.user_id = ?`,
      [id, req.user.id]
    );

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      transaction: {
        id: transaction.id,
        uuid: transaction.uuid,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        reference: transaction.reference,
        status: transaction.status,
        metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null,
        createdAt: transaction.created_at
      }
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      error: 'Failed to get transaction',
      code: 'GET_ERROR'
    });
  }
});

// Get wallet statistics
router.get('/stats', async (req, res) => {
  try {
    const wallet = await getQuery(
      'SELECT * FROM wallets WHERE user_id = ?',
      [req.user.id]
    );

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found',
        code: 'WALLET_NOT_FOUND'
      });
    }

    // Get transaction counts by type
    const transactionStats = await allQuery(
      `SELECT type, COUNT(*) as count, SUM(amount) as total 
       FROM transactions WHERE user_id = ? AND status = 'completed' 
       GROUP BY type`,
      [req.user.id]
    );

    // Get recent transactions
    const recentTransactions = await allQuery(
      `SELECT type, amount, currency, description, created_at 
       FROM transactions WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT 5`,
      [req.user.id]
    );

    res.json({
      wallet: {
        balance: wallet.balance,
        frozenBalance: wallet.frozen_balance,
        availableBalance: wallet.balance - wallet.frozen_balance,
        currency: wallet.currency
      },
      stats: {
        totalTransactions: transactionStats.reduce((sum, stat) => sum + stat.count, 0),
        transactionTypes: transactionStats.reduce((acc, stat) => {
          acc[stat.type] = {
            count: stat.count,
            total: stat.total
          };
          return acc;
        }, {})
      },
      recentTransactions: recentTransactions.map(t => ({
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        createdAt: t.created_at
      }))
    });

  } catch (error) {
    console.error('Get wallet stats error:', error);
    res.status(500).json({
      error: 'Failed to get wallet statistics',
      code: 'STATS_ERROR'
    });
  }
});

module.exports = router;
