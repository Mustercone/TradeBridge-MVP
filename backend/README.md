# TradeBridge Backend API

A comprehensive backend API server for the TradeBridge MVP platform, built with Node.js, Express, and SQLite/Supabase.

## Features

- 🔐 **JWT Authentication** - Secure user authentication with refresh tokens
- 📊 **Real-time Updates** - WebSocket support for live notifications
- 💰 **Wallet Management** - Digital wallet with transaction tracking
- 📋 **Trade Agreements** - Complete trade agreement lifecycle management
- 🚚 **Shipment Tracking** - Real-time shipment status updates
- 📄 **Invoice Processing** - AI-powered invoice data extraction
- 🔔 **Notifications** - Real-time notification system
- 📁 **File Uploads** - Secure document and image upload handling
- 🛡️ **Security** - Rate limiting, input validation, and error handling

## Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: SQLite (development) / Supabase (production)
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.IO
- **File Upload**: Multer
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### Prerequisites

- Node.js 16 or higher
- npm or yarn package manager

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   JWT_SECRET=your-super-secret-jwt-key
   DATABASE_PATH=./data/tradebridge.db
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/demo-login` - Demo login for testing

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/avatar` - Upload avatar image
- `PUT /api/users/password` - Change password
- `POST /api/users/documents` - Upload verification documents
- `GET /api/users/documents` - Get user documents
- `GET /api/users/stats` - Get user statistics

### Trade Agreements
- `POST /api/trade-agreements` - Create trade agreement
- `GET /api/trade-agreements` - Get user's trade agreements
- `GET /api/trade-agreements/:id` - Get specific trade agreement
- `PUT /api/trade-agreements/:id` - Update trade agreement
- `DELETE /api/trade-agreements/:id` - Delete trade agreement
- `POST /api/trade-agreements/:id/generate-contract` - Generate contract

### Shipments
- `POST /api/shipments` - Create shipment
- `GET /api/shipments` - Get user's shipments
- `GET /api/shipments/:id` - Get specific shipment
- `PUT /api/shipments/:id` - Update shipment
- `DELETE /api/shipments/:id` - Delete shipment
- `GET /api/shipments/track/:trackingNumber` - Track shipment (public)

### Wallet
- `GET /api/wallet/balance` - Get wallet balance
- `GET /api/wallet/transactions` - Get transaction history
- `POST /api/wallet/transactions` - Create transaction
- `POST /api/wallet/transfer` - Transfer funds
- `GET /api/wallet/transactions/:id` - Get specific transaction
- `GET /api/wallet/stats` - Get wallet statistics

### Invoices
- `POST /api/invoices/upload` - Upload invoice file
- `POST /api/invoices` - Create invoice manually
- `GET /api/invoices` - Get user's invoices
- `GET /api/invoices/:id` - Get specific invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/generate-smart-contract` - Generate smart contract

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/:id` - Get specific notification
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification
- `DELETE /api/notifications` - Delete all notifications
- `GET /api/notifications/stats` - Get notification statistics

## Database Schema

### Users Table
- User authentication and profile information
- Verification status and document tracking
- Account management and security

### Trade Agreements Table
- Complete trade agreement details
- Buyer/seller information
- Product specifications and pricing
- Contract generation and status tracking

### Shipments Table
- Shipment tracking and logistics
- Carrier and route information
- Delivery status and timeline
- Document management

### Wallets Table
- Digital wallet balances
- Multi-currency support
- Frozen balance management

### Transactions Table
- Complete transaction history
- Multiple transaction types
- Reference tracking and metadata

### Invoices Table
- Invoice processing and management
- AI-extracted data storage
- Smart contract integration
- File storage and retrieval

### Notifications Table
- Real-time notification system
- Multiple notification types
- Read status tracking
- Metadata storage

## Supabase Integration

For production deployment, the backend supports Supabase integration:

1. **Set up Supabase project**
   - Create a new Supabase project
   - Get your project URL and API keys

2. **Configure environment variables**
   ```env
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

3. **Run database migrations**
   ```bash
   npm run migrate
   ```

## WebSocket Events

The server supports real-time updates via WebSocket:

### Client Events
- `join-user-room` - Join user-specific room
- `trade-agreement-update` - Broadcast trade agreement changes
- `shipment-update` - Broadcast shipment status changes
- `wallet-transaction` - Broadcast wallet transactions

### Server Events
- `trade-agreement-changed` - Trade agreement updates
- `shipment-changed` - Shipment status updates
- `wallet-transaction-update` - Wallet transaction updates

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with configurable rounds
- **Rate Limiting** - Prevent abuse and DDoS attacks
- **Input Validation** - Joi schema validation
- **CORS Protection** - Cross-origin request security
- **Helmet Security** - HTTP header security
- **File Upload Security** - File type and size validation

## Error Handling

Comprehensive error handling with:
- Structured error responses
- Error codes for client handling
- Detailed logging for debugging
- Graceful error recovery

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run test suite
- `npm run migrate` - Run database migrations

### File Structure
```
backend/
├── config/          # Database and Supabase configuration
├── middleware/       # Authentication and error handling
├── routes/          # API route handlers
├── uploads/         # File upload storage
├── data/           # SQLite database files
├── server.js       # Main server file
├── package.json    # Dependencies and scripts
└── README.md       # This file
```

## Production Deployment

### Environment Variables
Set the following environment variables for production:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com
JWT_SECRET=your-production-jwt-secret
DATABASE_PATH=/path/to/production/database.db
SUPABASE_URL=your-production-supabase-url
SUPABASE_ANON_KEY=your-production-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-supabase-service-key
```

### Security Considerations
- Use strong JWT secrets
- Enable HTTPS in production
- Set up proper CORS origins
- Configure rate limiting appropriately
- Use environment variables for sensitive data
- Regular security updates and monitoring

## Testing

The API includes comprehensive testing:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "authentication"
npm test -- --grep "trade-agreements"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**TradeBridge Backend API** - Powering the future of trade finance 🚀
