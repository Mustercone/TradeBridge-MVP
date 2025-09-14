const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// Validation schemas
const createTradeAgreementSchema = Joi.object({
  agreementName: Joi.string().min(3).max(100).required(),
  buyerCompany: Joi.string().min(2).max(100).required(),
  sellerCompany: Joi.string().min(2).max(100).required(),
  buyerEmail: Joi.string().email().required(),
  sellerEmail: Joi.string().email().required(),
  productDescription: Joi.string().min(10).max(500).required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('USD'),
  paymentTerms: Joi.string().max(100).default('30 days'),
  deliveryTerms: Joi.string().max(100).default('FOB')
});

const updateTradeAgreementSchema = Joi.object({
  agreementName: Joi.string().min(3).max(100).optional(),
  buyerCompany: Joi.string().min(2).max(100).optional(),
  sellerCompany: Joi.string().min(2).max(100).optional(),
  buyerEmail: Joi.string().email().optional(),
  sellerEmail: Joi.string().email().optional(),
  productDescription: Joi.string().min(10).max(500).optional(),
  quantity: Joi.number().integer().min(1).optional(),
  unitPrice: Joi.number().positive().optional(),
  currency: Joi.string().length(3).optional(),
  paymentTerms: Joi.string().max(100).optional(),
  deliveryTerms: Joi.string().max(100).optional(),
  status: Joi.string().valid('draft', 'pending', 'approved', 'rejected', 'active', 'completed', 'cancelled').optional()
});

// Create trade agreement
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = createTradeAgreementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const {
      agreementName,
      buyerCompany,
      sellerCompany,
      buyerEmail,
      sellerEmail,
      productDescription,
      quantity,
      unitPrice,
      currency,
      paymentTerms,
      deliveryTerms
    } = value;

    const totalAmount = quantity * unitPrice;
    const agreementUuid = uuidv4();

    // Create trade agreement
    const result = await runQuery(
      `INSERT INTO trade_agreements 
       (uuid, user_id, agreement_name, buyer_company, seller_company, buyer_email, seller_email,
        product_description, quantity, unit_price, total_amount, currency, payment_terms, delivery_terms, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agreementUuid, req.user.id, agreementName, buyerCompany, sellerCompany,
        buyerEmail, sellerEmail, productDescription, quantity, unitPrice,
        totalAmount, currency, paymentTerms, deliveryTerms, 'draft'
      ]
    );

    // Get created agreement
    const agreement = await getQuery(
      `SELECT * FROM trade_agreements WHERE id = ?`,
      [result.id]
    );

    // Create notification
    await runQuery(
      `INSERT INTO notifications (uuid, user_id, type, title, message, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), req.user.id, 'trade',
        'Trade Agreement Created',
        `Trade agreement "${agreementName}" has been created successfully`,
        JSON.stringify({ agreementId: agreement.id, agreementUuid })
      ]
    );

    res.status(201).json({
      message: 'Trade agreement created successfully',
      agreement: {
        id: agreement.id,
        uuid: agreement.uuid,
        agreementName: agreement.agreement_name,
        buyerCompany: agreement.buyer_company,
        sellerCompany: agreement.seller_company,
        buyerEmail: agreement.buyer_email,
        sellerEmail: agreement.seller_email,
        productDescription: agreement.product_description,
        quantity: agreement.quantity,
        unitPrice: agreement.unit_price,
        totalAmount: agreement.total_amount,
        currency: agreement.currency,
        paymentTerms: agreement.payment_terms,
        deliveryTerms: agreement.delivery_terms,
        status: agreement.status,
        contractUrl: agreement.contract_url,
        createdAt: agreement.created_at,
        updatedAt: agreement.updated_at
      }
    });

  } catch (error) {
    console.error('Create trade agreement error:', error);
    res.status(500).json({
      error: 'Failed to create trade agreement',
      code: 'CREATE_ERROR'
    });
  }
});

// Get all trade agreements for user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = ?';
    let queryParams = [req.user.id];

    // Add status filter
    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    // Add search filter
    if (search) {
      whereClause += ' AND (agreement_name LIKE ? OR buyer_company LIKE ? OR seller_company LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Get agreements
    const agreements = await allQuery(
      `SELECT * FROM trade_agreements ${whereClause} 
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    // Get total count
    const totalResult = await getQuery(
      `SELECT COUNT(*) as total FROM trade_agreements ${whereClause}`,
      queryParams
    );

    res.json({
      agreements: agreements.map(agreement => ({
        id: agreement.id,
        uuid: agreement.uuid,
        agreementName: agreement.agreement_name,
        buyerCompany: agreement.buyer_company,
        sellerCompany: agreement.seller_company,
        buyerEmail: agreement.buyer_email,
        sellerEmail: agreement.seller_email,
        productDescription: agreement.product_description,
        quantity: agreement.quantity,
        unitPrice: agreement.unit_price,
        totalAmount: agreement.total_amount,
        currency: agreement.currency,
        paymentTerms: agreement.payment_terms,
        deliveryTerms: agreement.delivery_terms,
        status: agreement.status,
        contractUrl: agreement.contract_url,
        createdAt: agreement.created_at,
        updatedAt: agreement.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get trade agreements error:', error);
    res.status(500).json({
      error: 'Failed to get trade agreements',
      code: 'GET_ERROR'
    });
  }
});

// Get single trade agreement
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const agreement = await getQuery(
      `SELECT * FROM trade_agreements WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (!agreement) {
      return res.status(404).json({
        error: 'Trade agreement not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      agreement: {
        id: agreement.id,
        uuid: agreement.uuid,
        agreementName: agreement.agreement_name,
        buyerCompany: agreement.buyer_company,
        sellerCompany: agreement.seller_company,
        buyerEmail: agreement.buyer_email,
        sellerEmail: agreement.seller_email,
        productDescription: agreement.product_description,
        quantity: agreement.quantity,
        unitPrice: agreement.unit_price,
        totalAmount: agreement.total_amount,
        currency: agreement.currency,
        paymentTerms: agreement.payment_terms,
        deliveryTerms: agreement.delivery_terms,
        status: agreement.status,
        contractUrl: agreement.contract_url,
        createdAt: agreement.created_at,
        updatedAt: agreement.updated_at
      }
    });

  } catch (error) {
    console.error('Get trade agreement error:', error);
    res.status(500).json({
      error: 'Failed to get trade agreement',
      code: 'GET_ERROR'
    });
  }
});

// Update trade agreement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    const { error, value } = updateTradeAgreementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if agreement exists
    const existingAgreement = await getQuery(
      'SELECT * FROM trade_agreements WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existingAgreement) {
      return res.status(404).json({
        error: 'Trade agreement not found',
        code: 'NOT_FOUND'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates.push(`${dbKey} = ?`);
        values.push(value[key]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        code: 'NO_UPDATES'
      });
    }

    // Recalculate total amount if quantity or unit price changed
    if (value.quantity !== undefined || value.unitPrice !== undefined) {
      const newQuantity = value.quantity || existingAgreement.quantity;
      const newUnitPrice = value.unitPrice || existingAgreement.unit_price;
      updates.push('total_amount = ?');
      values.push(newQuantity * newUnitPrice);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await runQuery(
      `UPDATE trade_agreements SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated agreement
    const updatedAgreement = await getQuery(
      'SELECT * FROM trade_agreements WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Trade agreement updated successfully',
      agreement: {
        id: updatedAgreement.id,
        uuid: updatedAgreement.uuid,
        agreementName: updatedAgreement.agreement_name,
        buyerCompany: updatedAgreement.buyer_company,
        sellerCompany: updatedAgreement.seller_company,
        buyerEmail: updatedAgreement.buyer_email,
        sellerEmail: updatedAgreement.seller_email,
        productDescription: updatedAgreement.product_description,
        quantity: updatedAgreement.quantity,
        unitPrice: updatedAgreement.unit_price,
        totalAmount: updatedAgreement.total_amount,
        currency: updatedAgreement.currency,
        paymentTerms: updatedAgreement.payment_terms,
        deliveryTerms: updatedAgreement.delivery_terms,
        status: updatedAgreement.status,
        contractUrl: updatedAgreement.contract_url,
        createdAt: updatedAgreement.created_at,
        updatedAt: updatedAgreement.updated_at
      }
    });

  } catch (error) {
    console.error('Update trade agreement error:', error);
    res.status(500).json({
      error: 'Failed to update trade agreement',
      code: 'UPDATE_ERROR'
    });
  }
});

// Delete trade agreement
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if agreement exists
    const agreement = await getQuery(
      'SELECT * FROM trade_agreements WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!agreement) {
      return res.status(404).json({
        error: 'Trade agreement not found',
        code: 'NOT_FOUND'
      });
    }

    // Check if agreement has associated shipments
    const shipments = await getQuery(
      'SELECT COUNT(*) as count FROM shipments WHERE trade_agreement_id = ?',
      [id]
    );

    if (shipments.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete trade agreement with associated shipments',
        code: 'HAS_SHIPMENTS'
      });
    }

    // Delete agreement
    await runQuery(
      'DELETE FROM trade_agreements WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Trade agreement deleted successfully'
    });

  } catch (error) {
    console.error('Delete trade agreement error:', error);
    res.status(500).json({
      error: 'Failed to delete trade agreement',
      code: 'DELETE_ERROR'
    });
  }
});

// Generate contract document
router.post('/:id/generate-contract', async (req, res) => {
  try {
    const { id } = req.params;

    const agreement = await getQuery(
      'SELECT * FROM trade_agreements WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!agreement) {
      return res.status(404).json({
        error: 'Trade agreement not found',
        code: 'NOT_FOUND'
      });
    }

    // Generate contract URL (in a real implementation, this would generate an actual document)
    const contractUuid = uuidv4();
    const contractUrl = `/contracts/${contractUuid}.pdf`;

    // Update agreement with contract URL
    await runQuery(
      'UPDATE trade_agreements SET contract_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [contractUrl, id]
    );

    res.json({
      message: 'Contract generated successfully',
      contractUrl: contractUrl
    });

  } catch (error) {
    console.error('Generate contract error:', error);
    res.status(500).json({
      error: 'Failed to generate contract',
      code: 'CONTRACT_ERROR'
    });
  }
});

module.exports = router;
