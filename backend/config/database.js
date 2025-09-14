const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/tradebridge.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db;

// Initialize database connection
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
      } else {
        console.log('Connected to SQLite database');
        createTables()
          .then(() => resolve())
          .catch(reject);
      }
    });
  });
}

// Create database tables
function createTables() {
  return new Promise((resolve, reject) => {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        company TEXT,
        phone TEXT,
        country TEXT DEFAULT 'Nigeria',
        avatar_url TEXT,
        verification_status TEXT DEFAULT 'pending',
        bvn_verified BOOLEAN DEFAULT 0,
        documents_uploaded INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1
      )`,

      // Trade Agreements table
      `CREATE TABLE IF NOT EXISTS trade_agreements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        agreement_name TEXT NOT NULL,
        buyer_company TEXT NOT NULL,
        seller_company TEXT NOT NULL,
        buyer_email TEXT NOT NULL,
        seller_email TEXT NOT NULL,
        product_description TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        payment_terms TEXT DEFAULT '30 days',
        delivery_terms TEXT DEFAULT 'FOB',
        status TEXT DEFAULT 'draft',
        contract_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Shipments table
      `CREATE TABLE IF NOT EXISTS shipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        trade_agreement_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        tracking_number TEXT UNIQUE NOT NULL,
        carrier TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        estimated_delivery DATETIME,
        actual_delivery DATETIME,
        documents_urls TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_agreement_id) REFERENCES trade_agreements (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Wallet table
      `CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        currency TEXT DEFAULT 'USD',
        balance DECIMAL(15,2) DEFAULT 0.00,
        frozen_balance DECIMAL(15,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Transactions table
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        wallet_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'credit', 'debit', 'transfer', 'payment'
        amount DECIMAL(15,2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        description TEXT,
        reference TEXT,
        status TEXT DEFAULT 'pending',
        metadata TEXT, -- JSON string for additional data
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wallet_id) REFERENCES wallets (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Invoices table
      `CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        trade_agreement_id INTEGER,
        invoice_number TEXT UNIQUE NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        due_date DATE,
        status TEXT DEFAULT 'pending',
        file_url TEXT,
        extracted_data TEXT, -- JSON string for AI extracted data
        smart_contract_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (trade_agreement_id) REFERENCES trade_agreements (id)
      )`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'trade', 'shipment', 'payment', 'system'
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        metadata TEXT, -- JSON string for additional data
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // User Sessions table
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Document Uploads table
      `CREATE TABLE IF NOT EXISTS document_uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_type TEXT NOT NULL,
        upload_type TEXT NOT NULL, -- 'cac', 'bvn', 'invoice', 'contract'
        status TEXT DEFAULT 'uploaded',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    let completed = 0;
    const total = tables.length;

    tables.forEach((tableSQL, index) => {
      db.run(tableSQL, (err) => {
        if (err) {
          console.error(`Error creating table ${index + 1}:`, err);
          reject(err);
        } else {
          completed++;
          if (completed === total) {
            console.log('✅ All database tables created successfully');
            resolve();
          }
        }
      });
    });
  });
}

// Database query helper functions
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Close database connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initializeDatabase,
  closeDatabase,
  runQuery,
  getQuery,
  allQuery,
  getDb: () => db
};
