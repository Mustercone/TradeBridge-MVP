const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// Validation schemas
const createShipmentSchema = Joi.object({
  tradeAgreementId: Joi.number().integer().required(),
  trackingNumber: Joi.string().min(5).max(50).required(),
  carrier: Joi.string().min(2).max(50).required(),
  origin: Joi.string().min(2).max(100).required(),
  destination: Joi.string().min(2).max(100).required(),
  estimatedDelivery: Joi.date().optional()
});

const updateShipmentSchema = Joi.object({
  trackingNumber: Joi.string().min(5).max(50).optional(),
  carrier: Joi.string().min(2).max(50).optional(),
  origin: Joi.string().min(2).max(100).optional(),
  destination: Joi.string().min(2).max(100).optional(),
  status: Joi.string().valid('pending', 'in_transit', 'delivered', 'delayed', 'cancelled').optional(),
  estimatedDelivery: Joi.date().optional(),
  actualDelivery: Joi.date().optional(),
  documentsUrls: Joi.string().optional()
});

// Create shipment
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = createShipmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const {
      tradeAgreementId,
      trackingNumber,
      carrier,
      origin,
      destination,
      estimatedDelivery
    } = value;

    // Verify trade agreement exists and belongs to user
    const tradeAgreement = await getQuery(
      'SELECT * FROM trade_agreements WHERE id = ? AND user_id = ?',
      [tradeAgreementId, req.user.id]
    );

    if (!tradeAgreement) {
      return res.status(404).json({
        error: 'Trade agreement not found',
        code: 'TRADE_AGREEMENT_NOT_FOUND'
      });
    }

    // Check if tracking number already exists
    const existingShipment = await getQuery(
      'SELECT id FROM shipments WHERE tracking_number = ?',
      [trackingNumber]
    );

    if (existingShipment) {
      return res.status(409).json({
        error: 'Tracking number already exists',
        code: 'TRACKING_NUMBER_EXISTS'
      });
    }

    const shipmentUuid = uuidv4();

    // Create shipment
    const result = await runQuery(
      `INSERT INTO shipments 
       (uuid, trade_agreement_id, user_id, tracking_number, carrier, origin, destination, 
        status, estimated_delivery)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shipmentUuid, tradeAgreementId, req.user.id, trackingNumber, carrier,
        origin, destination, 'pending', estimatedDelivery
      ]
    );

    // Get created shipment
    const shipment = await getQuery(
      `SELECT s.*, ta.agreement_name, ta.buyer_company, ta.seller_company 
       FROM shipments s 
       JOIN trade_agreements ta ON s.trade_agreement_id = ta.id 
       WHERE s.id = ?`,
      [result.id]
    );

    // Create notification
    await runQuery(
      `INSERT INTO notifications (uuid, user_id, type, title, message, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), req.user.id, 'shipment',
        'Shipment Created',
        `Shipment ${trackingNumber} has been created successfully`,
        JSON.stringify({ shipmentId: shipment.id, shipmentUuid, trackingNumber })
      ]
    );

    res.status(201).json({
      message: 'Shipment created successfully',
      shipment: {
        id: shipment.id,
        uuid: shipment.uuid,
        tradeAgreementId: shipment.trade_agreement_id,
        agreementName: shipment.agreement_name,
        buyerCompany: shipment.buyer_company,
        sellerCompany: shipment.seller_company,
        trackingNumber: shipment.tracking_number,
        carrier: shipment.carrier,
        origin: shipment.origin,
        destination: shipment.destination,
        status: shipment.status,
        estimatedDelivery: shipment.estimated_delivery,
        actualDelivery: shipment.actual_delivery,
        documentsUrls: shipment.documents_urls,
        createdAt: shipment.created_at,
        updatedAt: shipment.updated_at
      }
    });

  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({
      error: 'Failed to create shipment',
      code: 'CREATE_ERROR'
    });
  }
});

// Get all shipments for user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE s.user_id = ?';
    let queryParams = [req.user.id];

    // Add status filter
    if (status) {
      whereClause += ' AND s.status = ?';
      queryParams.push(status);
    }

    // Add search filter
    if (search) {
      whereClause += ' AND (s.tracking_number LIKE ? OR s.carrier LIKE ? OR ta.agreement_name LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Get shipments
    const shipments = await allQuery(
      `SELECT s.*, ta.agreement_name, ta.buyer_company, ta.seller_company 
       FROM shipments s 
       JOIN trade_agreements ta ON s.trade_agreement_id = ta.id 
       ${whereClause} 
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    // Get total count
    const totalResult = await getQuery(
      `SELECT COUNT(*) as total FROM shipments s 
       JOIN trade_agreements ta ON s.trade_agreement_id = ta.id 
       ${whereClause}`,
      queryParams
    );

    res.json({
      shipments: shipments.map(shipment => ({
        id: shipment.id,
        uuid: shipment.uuid,
        tradeAgreementId: shipment.trade_agreement_id,
        agreementName: shipment.agreement_name,
        buyerCompany: shipment.buyer_company,
        sellerCompany: shipment.seller_company,
        trackingNumber: shipment.tracking_number,
        carrier: shipment.carrier,
        origin: shipment.origin,
        destination: shipment.destination,
        status: shipment.status,
        estimatedDelivery: shipment.estimated_delivery,
        actualDelivery: shipment.actual_delivery,
        documentsUrls: shipment.documents_urls,
        createdAt: shipment.created_at,
        updatedAt: shipment.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({
      error: 'Failed to get shipments',
      code: 'GET_ERROR'
    });
  }
});

// Get single shipment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = await getQuery(
      `SELECT s.*, ta.agreement_name, ta.buyer_company, ta.seller_company 
       FROM shipments s 
       JOIN trade_agreements ta ON s.trade_agreement_id = ta.id 
       WHERE s.id = ? AND s.user_id = ?`,
      [id, req.user.id]
    );

    if (!shipment) {
      return res.status(404).json({
        error: 'Shipment not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      shipment: {
        id: shipment.id,
        uuid: shipment.uuid,
        tradeAgreementId: shipment.trade_agreement_id,
        agreementName: shipment.agreement_name,
        buyerCompany: shipment.buyer_company,
        sellerCompany: shipment.seller_company,
        trackingNumber: shipment.tracking_number,
        carrier: shipment.carrier,
        origin: shipment.origin,
        destination: shipment.destination,
        status: shipment.status,
        estimatedDelivery: shipment.estimated_delivery,
        actualDelivery: shipment.actual_delivery,
        documentsUrls: shipment.documents_urls,
        createdAt: shipment.created_at,
        updatedAt: shipment.updated_at
      }
    });

  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({
      error: 'Failed to get shipment',
      code: 'GET_ERROR'
    });
  }
});

// Update shipment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    const { error, value } = updateShipmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if shipment exists
    const existingShipment = await getQuery(
      'SELECT * FROM shipments WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existingShipment) {
      return res.status(404).json({
        error: 'Shipment not found',
        code: 'NOT_FOUND'
      });
    }

    // Check if tracking number already exists (if being updated)
    if (value.trackingNumber && value.trackingNumber !== existingShipment.tracking_number) {
      const duplicateShipment = await getQuery(
        'SELECT id FROM shipments WHERE tracking_number = ? AND id != ?',
        [value.trackingNumber, id]
      );

      if (duplicateShipment) {
        return res.status(409).json({
          error: 'Tracking number already exists',
          code: 'TRACKING_NUMBER_EXISTS'
        });
      }
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

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await runQuery(
      `UPDATE shipments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated shipment
    const updatedShipment = await getQuery(
      `SELECT s.*, ta.agreement_name, ta.buyer_company, ta.seller_company 
       FROM shipments s 
       JOIN trade_agreements ta ON s.trade_agreement_id = ta.id 
       WHERE s.id = ?`,
      [id]
    );

    res.json({
      message: 'Shipment updated successfully',
      shipment: {
        id: updatedShipment.id,
        uuid: updatedShipment.uuid,
        tradeAgreementId: updatedShipment.trade_agreement_id,
        agreementName: updatedShipment.agreement_name,
        buyerCompany: updatedShipment.buyer_company,
        sellerCompany: updatedShipment.seller_company,
        trackingNumber: updatedShipment.tracking_number,
        carrier: updatedShipment.carrier,
        origin: updatedShipment.origin,
        destination: updatedShipment.destination,
        status: updatedShipment.status,
        estimatedDelivery: updatedShipment.estimated_delivery,
        actualDelivery: updatedShipment.actual_delivery,
        documentsUrls: updatedShipment.documents_urls,
        createdAt: updatedShipment.created_at,
        updatedAt: updatedShipment.updated_at
      }
    });

  } catch (error) {
    console.error('Update shipment error:', error);
    res.status(500).json({
      error: 'Failed to update shipment',
      code: 'UPDATE_ERROR'
    });
  }
});

// Delete shipment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if shipment exists
    const shipment = await getQuery(
      'SELECT * FROM shipments WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!shipment) {
      return res.status(404).json({
        error: 'Shipment not found',
        code: 'NOT_FOUND'
      });
    }

    // Delete shipment
    await runQuery(
      'DELETE FROM shipments WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Shipment deleted successfully'
    });

  } catch (error) {
    console.error('Delete shipment error:', error);
    res.status(500).json({
      error: 'Failed to delete shipment',
      code: 'DELETE_ERROR'
    });
  }
});

// Track shipment (public endpoint for tracking)
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const shipment = await getQuery(
      `SELECT s.*, ta.agreement_name, ta.buyer_company, ta.seller_company 
       FROM shipments s 
       JOIN trade_agreements ta ON s.trade_agreement_id = ta.id 
       WHERE s.tracking_number = ?`,
      [trackingNumber]
    );

    if (!shipment) {
      return res.status(404).json({
        error: 'Shipment not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      shipment: {
        trackingNumber: shipment.tracking_number,
        carrier: shipment.carrier,
        origin: shipment.origin,
        destination: shipment.destination,
        status: shipment.status,
        estimatedDelivery: shipment.estimated_delivery,
        actualDelivery: shipment.actual_delivery,
        createdAt: shipment.created_at,
        updatedAt: shipment.updated_at
      }
    });

  } catch (error) {
    console.error('Track shipment error:', error);
    res.status(500).json({
      error: 'Failed to track shipment',
      code: 'TRACK_ERROR'
    });
  }
});

module.exports = router;
