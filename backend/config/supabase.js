const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let supabaseAdmin = null;

// Initialize Supabase client
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client initialized');
} else {
  console.log('⚠️ Supabase not configured - using SQLite database');
}

// Initialize Supabase admin client
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Supabase admin client initialized');
}

// Supabase database operations
class SupabaseDB {
  constructor() {
    this.client = supabase;
    this.admin = supabaseAdmin;
  }

  // Check if Supabase is available
  isAvailable() {
    return this.client !== null;
  }

  // User operations
  async createUser(userData) {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.client.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            company: userData.company,
            phone: userData.phone,
            country: userData.country
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase create user error:', error);
      throw error;
    }
  }

  async signInUser(email, password) {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase sign in error:', error);
      throw error;
    }
  }

  async signOutUser() {
    if (!this.isAvailable()) return null;

    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Supabase sign out error:', error);
      throw error;
    }
  }

  // Database table operations
  async insert(table, data) {
    if (!this.isAvailable()) return null;

    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`Supabase insert error (${table}):`, error);
      throw error;
    }
  }

  async select(table, filters = {}, options = {}) {
    if (!this.isAvailable()) return null;

    try {
      let query = this.client.from(table).select(options.select || '*');

      // Apply filters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          query = query.eq(key, filters[key]);
        }
      });

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Supabase select error (${table}):`, error);
      throw error;
    }
  }

  async update(table, id, data) {
    if (!this.isAvailable()) return null;

    try {
      const { data: result, error } = await this.client
        .from(table)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`Supabase update error (${table}):`, error);
      throw error;
    }
  }

  async delete(table, id) {
    if (!this.isAvailable()) return null;

    try {
      const { error } = await this.client
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Supabase delete error (${table}):`, error);
      throw error;
    }
  }

  // File storage operations
  async uploadFile(bucket, path, file) {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase file upload error:', error);
      throw error;
    }
  }

  async getFileUrl(bucket, path) {
    if (!this.isAvailable()) return null;

    try {
      const { data } = this.client.storage
        .from(bucket)
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (error) {
      console.error('Supabase get file URL error:', error);
      throw error;
    }
  }

  async deleteFile(bucket, path) {
    if (!this.isAvailable()) return null;

    try {
      const { error } = await this.client.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Supabase delete file error:', error);
      throw error;
    }
  }

  // Real-time subscriptions
  subscribeToTable(table, callback, filters = {}) {
    if (!this.isAvailable()) return null;

    try {
      let subscription = this.client
        .from(table)
        .on('*', callback)
        .subscribe();

      return subscription;
    } catch (error) {
      console.error(`Supabase subscription error (${table}):`, error);
      throw error;
    }
  }

  unsubscribe(subscription) {
    if (subscription) {
      this.client.removeChannel(subscription);
    }
  }
}

// Create Supabase database instance
const supabaseDB = new SupabaseDB();

// Supabase table schemas (for reference)
const SUPABASE_SCHEMAS = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      company TEXT,
      phone TEXT,
      country TEXT DEFAULT 'Nigeria',
      avatar_url TEXT,
      verification_status TEXT DEFAULT 'pending',
      bvn_verified BOOLEAN DEFAULT false,
      documents_uploaded INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_login TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true
    );
  `,
  
  trade_agreements: `
    CREATE TABLE IF NOT EXISTS trade_agreements (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  shipments: `
    CREATE TABLE IF NOT EXISTS shipments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      trade_agreement_id UUID REFERENCES trade_agreements(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      tracking_number TEXT UNIQUE NOT NULL,
      carrier TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      estimated_delivery TIMESTAMP WITH TIME ZONE,
      actual_delivery TIMESTAMP WITH TIME ZONE,
      documents_urls TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  wallets: `
    CREATE TABLE IF NOT EXISTS wallets (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT DEFAULT 'USD',
      balance DECIMAL(15,2) DEFAULT 0.00,
      frozen_balance DECIMAL(15,2) DEFAULT 0.00,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  transactions: `
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      description TEXT,
      reference TEXT,
      status TEXT DEFAULT 'pending',
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  invoices: `
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      trade_agreement_id UUID REFERENCES trade_agreements(id) ON DELETE SET NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      due_date DATE,
      status TEXT DEFAULT 'pending',
      file_url TEXT,
      extracted_data JSONB,
      smart_contract_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  notifications: `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
};

module.exports = {
  supabaseDB,
  SUPABASE_SCHEMAS,
  supabase,
  supabaseAdmin
};
