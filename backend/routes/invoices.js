const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// Configure multer for invoice file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `invoice-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

// Validation schemas
const createInvoiceSchema = Joi.object({
  tradeAgreementId: Joi.number().integer().optional(),
  invoiceNumber: Joi.string().min(3).max(50).required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('USD'),
  dueDate: Joi.date().optional()
});

const updateInvoiceSchema = Joi.object({
  invoiceNumber: Joi.string().min(3).max(50).optional(),
  amount: Joi.number().positive().optional(),
  currency: Joi.string().length(3).optional(),
  dueDate: Joi.date().optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'paid', 'overdue').optional()
});

// Upload invoice file
router.post('/upload', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    const invoiceUuid = uuidv4();
    const fileUrl = `/uploads/invoices/${req.file.filename}`;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Simulate AI extraction (in real implementation, this would use AI/ML)
    const extractedData = {
      invoiceNumber: invoiceNumber,
      amount: Math.floor(Math.random() * 10000) + 1000, // Random amount for demo
      currency: 'USD',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      vendor: 'Sample Vendor',
      customer: 'Sample Customer',
      items: [
        {
          description: 'Sample Product/Service',
          quantity: 1,
          unitPrice: Math.floor(Math.random() * 10000) + 1000,
          total: Math.floor(Math.random() * 10000) + 1000
        }
      ],
      extractedAt: new Date().toISOString()
    };

    // Create invoice record
    const result = await runQuery(
      `INSERT INTO invoices 
       (uuid, user_id, invoice_number, amount, currency, due_date, status, file_url, extracted_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceUuid, req.user.id, invoiceNumber, extractedData.amount, extractedData.currency,
        extractedData.dueDate, 'pending', fileUrl, JSON.stringify(extractedData)
      ]
    );

    // Create notification
    await runQuery(
      `INSERT INTO notifications (uuid, user_id, type, title, message, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), req.user.id, 'invoice',
        'Invoice Uploaded',
        `Invoice ${invoiceNumber} has been uploaded and processed`,
        JSON.stringify({ invoiceId: result.id, invoiceUuid, invoiceNumber })
      ]
    );

    res.status(201).json({
      message: 'Invoice uploaded and processed successfully',
      invoice: {
        id: result.id,
        uuid: invoiceUuid,
        invoiceNumber: invoiceNumber,
        amount: extractedData.amount,
        currency: extractedData.currency,
        dueDate: extractedData.dueDate,
        status: 'pending',
        fileUrl: fileUrl,
        extractedData: extractedData
      }
    });

  } catch (error) {
    console.error('Invoice upload error:', error);
    res.status(500).json({
      error: 'Failed to upload invoice',
      code: 'UPLOAD_ERROR'
    });
  }
});

// Create invoice manually
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = createInvoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { tradeAgreementId, invoiceNumber, amount, currency, dueDate } = value;

    // Verify trade agreement exists and belongs to user (if provided)
    if (tradeAgreementId) {
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
    }

    // Check if invoice number already exists
    const existingInvoice = await getQuery(
      'SELECT id FROM invoices WHERE invoice_number = ?',
      [invoiceNumber]
    );

    if (existingInvoice) {
      return res.status(409).json({
        error: 'Invoice number already exists',
        code: 'INVOICE_NUMBER_EXISTS'
      });
    }

    const invoiceUuid = uuidv4();

    // Create invoice
    const result = await runQuery(
      `INSERT INTO invoices 
       (uuid, user_id, trade_agreement_id, invoice_number, amount, currency, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceUuid, req.user.id, tradeAgreementId, invoiceNumber, amount, currency,
        dueDate, 'pending'
      ]
    );

    // Get created invoice
    const invoice = await getQuery(
      'SELECT * FROM invoices WHERE id = ?',
      [result.id]
    );

    // Create notification
    await runQuery(
      `INSERT INTO notifications (uuid, user_id, type, title, message, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), req.user.id, 'invoice',
        'Invoice Created',
        `Invoice ${invoiceNumber} has been created successfully`,
        JSON.stringify({ invoiceId: invoice.id, invoiceUuid, invoiceNumber })
      ]
    );

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: {
        id: invoice.id,
        uuid: invoice.uuid,
        tradeAgreementId: invoice.trade_agreement_id,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
        dueDate: invoice.due_date,
        status: invoice.status,
        fileUrl: invoice.file_url,
        extractedData: invoice.extracted_data ? JSON.parse(invoice.extracted_data) : null,
        smartContractUrl: invoice.smart_contract_url,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at
      }
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      error: 'Failed to create invoice',
      code: 'CREATE_ERROR'
    });
  }
});

// Get all invoices for user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE i.user_id = ?';
    let queryParams = [req.user.id];

    // Add status filter
    if (status) {
      whereClause += ' AND i.status = ?';
      queryParams.push(status);
    }

    // Add search filter
    if (search) {
      whereClause += ' AND (i.invoice_number LIKE ? OR i.amount LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    // Get invoices
    const invoices = await allQuery(
      `SELECT i.*, ta.agreement_name 
       FROM invoices i 
       LEFT JOIN trade_agreements ta ON i.trade_agreement_id = ta.id 
       ${whereClause} 
       ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    // Get total count
    const totalResult = await getQuery(
      `SELECT COUNT(*) as total FROM invoices i 
       LEFT JOIN trade_agreements ta ON i.trade_agreement_id = ta.id 
       ${whereClause}`,
      queryParams
    );

    res.json({
      invoices: invoices.map(invoice => ({
        id: invoice.id,
        uuid: invoice.uuid,
        tradeAgreementId: invoice.trade_agreement_id,
        agreementName: invoice.agreement_name,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
        dueDate: invoice.due_date,
        status: invoice.status,
        fileUrl: invoice.file_url,
        extractedData: invoice.extracted_data ? JSON.parse(invoice.extracted_data) : null,
        smartContractUrl: invoice.smart_contract_url,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      error: 'Failed to get invoices',
      code: 'GET_ERROR'
    });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await getQuery(
      `SELECT i.*, ta.agreement_name 
       FROM invoices i 
       LEFT JOIN trade_agreements ta ON i.trade_agreement_id = ta.id 
       WHERE i.id = ? AND i.user_id = ?`,
      [id, req.user.id]
    );

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      invoice: {
        id: invoice.id,
        uuid: invoice.uuid,
        tradeAgreementId: invoice.trade_agreement_id,
        agreementName: invoice.agreement_name,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
        dueDate: invoice.due_date,
        status: invoice.status,
        fileUrl: invoice.file_url,
        extractedData: invoice.extracted_data ? JSON.parse(invoice.extracted_data) : null,
        smartContractUrl: invoice.smart_contract_url,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at
      }
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      error: 'Failed to get invoice',
      code: 'GET_ERROR'
    });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    const { error, value } = updateInvoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if invoice exists
    const existingInvoice = await getQuery(
      'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existingInvoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        code: 'NOT_FOUND'
      });
    }

    // Check if invoice number already exists (if being updated)
    if (value.invoiceNumber && value.invoiceNumber !== existingInvoice.invoice_number) {
      const duplicateInvoice = await getQuery(
        'SELECT id FROM invoices WHERE invoice_number = ? AND id != ?',
        [value.invoiceNumber, id]
      );

      if (duplicateInvoice) {
        return res.status(409).json({
          error: 'Invoice number already exists',
          code: 'INVOICE_NUMBER_EXISTS'
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
      `UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated invoice
    const updatedInvoice = await getQuery(
      `SELECT i.*, ta.agreement_name 
       FROM invoices i 
       LEFT JOIN trade_agreements ta ON i.trade_agreement_id = ta.id 
       WHERE i.id = ?`,
      [id]
    );

    res.json({
      message: 'Invoice updated successfully',
      invoice: {
        id: updatedInvoice.id,
        uuid: updatedInvoice.uuid,
        tradeAgreementId: updatedInvoice.trade_agreement_id,
        agreementName: updatedInvoice.agreement_name,
        invoiceNumber: updatedInvoice.invoice_number,
        amount: updatedInvoice.amount,
        currency: updatedInvoice.currency,
        dueDate: updatedInvoice.due_date,
        status: updatedInvoice.status,
        fileUrl: updatedInvoice.file_url,
        extractedData: updatedInvoice.extracted_data ? JSON.parse(updatedInvoice.extracted_data) : null,
        smartContractUrl: updatedInvoice.smart_contract_url,
        createdAt: updatedInvoice.created_at,
        updatedAt: updatedInvoice.updated_at
      }
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      error: 'Failed to update invoice',
      code: 'UPDATE_ERROR'
    });
  }
});

// Generate smart contract
router.post('/:id/generate-smart-contract', async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await getQuery(
      'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        code: 'NOT_FOUND'
      });
    }

    // Generate smart contract URL (in a real implementation, this would generate an actual smart contract)
    const contractUuid = uuidv4();
    const smartContractUrl = `/smart-contracts/${contractUuid}.json`;

    // Update invoice with smart contract URL
    await runQuery(
      'UPDATE invoices SET smart_contract_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [smartContractUrl, id]
    );

    // Create notification
    await runQuery(
      `INSERT INTO notifications (uuid, user_id, type, title, message, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), req.user.id, 'invoice',
        'Smart Contract Generated',
        `Smart contract for invoice ${invoice.invoice_number} has been generated`,
        JSON.stringify({ invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, smartContractUrl })
      ]
    );

    res.json({
      message: 'Smart contract generated successfully',
      smartContractUrl: smartContractUrl
    });

  } catch (error) {
    console.error('Generate smart contract error:', error);
    res.status(500).json({
      error: 'Failed to generate smart contract',
      code: 'CONTRACT_ERROR'
    });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if invoice exists
    const invoice = await getQuery(
      'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        code: 'NOT_FOUND'
      });
    }

    // Delete invoice
    await runQuery(
      'DELETE FROM invoices WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      error: 'Failed to delete invoice',
      code: 'DELETE_ERROR'
    });
  }
});

module.exports = router;
