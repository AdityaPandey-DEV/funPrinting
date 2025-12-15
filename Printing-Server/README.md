# Printing Server

MongoDB-based printing server for funPrinting. This server polls MongoDB for pending orders and processes them directly, eliminating the need for API communication between the website and printing server.

## Architecture

- **No API Communication**: Website and printing server both use MongoDB as the single source of truth
- **Atomic State Transitions**: Uses MongoDB `findOneAndUpdate` for safe concurrent access
- **Real-time Monitoring**: Printer health and order status tracked in MongoDB
- **Windows Support**: Designed for Windows printers using `pdf-to-printer`
- **Print Job Idempotency**: UUID-based printJobId prevents duplicate physical prints
- **Worker Ownership**: Multi-server support with worker ownership tracking
- **Graceful Shutdown**: Automatically resets orders on server shutdown
- **Capability Validation**: Validates orders against printer capabilities before printing
- **File Integrity**: Validates files before printing (existence, size, PDF header)
- **Observability**: Tracks metrics (prints/hour, failures/hour, delays, offline duration)

## Prerequisites

- Node.js 18+ and npm
- MongoDB database (shared with website)
- Windows OS with printer drivers installed
- Printer connected and configured

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AdityaPandey-DEV/Printing-Server.git
   cd Printing-Server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp env.example .env
   ```

4. **Edit `.env` file:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/print-service
   PRINTER_NAME=Your Printer Name
   PRINTER_ID=printer_001
   SYSTEM_NAME=Windows
   ORDER_POLL_INTERVAL=5000
   HEALTH_CHECK_INTERVAL=30000
   MAX_RETRIES=3
   RETRY_DELAY=5000
   LOG_LEVEL=info
   ```

## Configuration

### MongoDB Connection

Set `MONGODB_URI` to your MongoDB connection string. This must be the same database used by the website.

### Printer Configuration

1. **Find your printer name:**
   ```powershell
   wmic printer get name
   ```

2. **Set `PRINTER_NAME`** in `.env` to match your printer name exactly.

3. **Set `PRINTER_ID`** to a unique identifier for this printer (e.g., `printer_001`).

### Polling Intervals

- `ORDER_POLL_INTERVAL`: How often to check for pending orders (default: 5000ms = 5 seconds)
- `HEALTH_CHECK_INTERVAL`: How often to check printer health (default: 30000ms = 30 seconds)

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

## How It Works

1. **Order Processing:**
   - Server polls MongoDB for orders with `printStatus: 'pending'` and `paymentStatus: 'completed'`
   - Validates order against printer capabilities (page size, color, duplex, copies)
   - Atomically claims order by updating `printStatus: 'pending' → 'printing'` with:
     - Unique `printJobId` (UUID) for idempotency
     - `printingBy` (workerId) for ownership tracking
     - `printAttempt: 1` for retry tracking
   - Downloads file from Cloudinary
   - Validates file (existence, size, PDF header)
   - Checks idempotency: skips if `printJobId` already printed
   - Sends to printer
   - Updates `printStatus: 'printing' → 'printed'` on success (only if owned by this worker)
   - Resets to `'pending'` with error message on failure (only if owned by this worker)

2. **Printer Health Monitoring:**
   - Checks printer status every 30 seconds (configurable)
   - Updates MongoDB `printers` collection with:
     - Status (online/offline/busy/error)
     - Queue length
     - Last seen timestamp
     - Error messages

3. **Stuck Order Detection:**
   - Automatically resets orders stuck in 'printing' state for > 30 minutes
   - Logs to MongoDB for admin review

## Print Status States

Orders have exactly three print states:

- **`pending`**: Order waiting to be printed
- **`printing`**: Order currently being printed (owned by a specific worker)
- **`printed`**: Order successfully printed

State transitions are atomic and prevent duplicate printing.

### Idempotency

Each print job has a unique `printJobId` (UUID). The same `printJobId` will never be printed twice, even if:
- Server restarts mid-print
- Network errors occur
- Multiple workers attempt to process the same order

### Worker Ownership

Each printing server has a unique `workerId`. When an order is claimed:
- `printingBy` is set to the worker's ID
- Only that worker can complete or reset the job
- Other workers ignore orders owned by different workers
- On shutdown, orders owned by this worker are reset to `pending`

## Failure-Proofing Layers

The printing system includes comprehensive failure-proofing to ensure ZERO duplicate physical prints and ZERO stuck orders, even in the face of crashes, power failures, network issues, and human errors.

### State Machine Enforcement

- **Strict State Transitions**: Only allowed transitions are:
  - `pending → printing` (automatic)
  - `printing → printed` (on success)
  - `printing → pending` (on failure/reset)
  - `printed → pending` (admin override only)
- **Validation**: All state transitions are validated before execution
- **Logging**: Every transition is logged to `print_logs`

### Print Attempt & Retry Control

- **Max Attempts**: Default limit of 3 attempts per order
- **Automatic Stop**: Orders exceeding max attempts stop automatic retries
- **Admin Action Required**: Orders with max attempts reached require manual admin intervention
- **Increment Tracking**: `printAttempt` counter tracks retry attempts

### Heartbeat & Stale Job Detection

- **Heartbeat Updates**: `printingHeartbeatAt` updated every 10 seconds during printing
- **Stale Detection**: Jobs with stale heartbeats (>5 minutes) are automatically recovered
- **Crash Recovery**: Detects crashed servers and resets orphaned jobs
- **Auto-Recovery**: No manual intervention required for stale jobs

### Power Failure & Crash Recovery

- **Startup Recovery**: On server startup, automatically recovers:
  - Orders owned by this worker (`printingBy = workerId`)
  - Orphaned orders (no `printingBy`)
- **Increment Attempts**: Recovered orders have `printAttempt` incremented
- **Logging**: All recovery actions logged to `print_logs`

### Printer-Level Failure Handling

- **Auto-Pause**: Printing automatically pauses when printer has hard errors:
  - Offline
  - Paper jam
  - Out of paper
  - Out of ink
- **Auto-Resume**: Printing automatically resumes when printer recovers
- **Status Tracking**: `autoPrintEnabled` flag controls automatic printing

### File-Level Failure Safety

- **Existence Check**: Verifies file exists before printing
- **Size Validation**: Minimum 500 bytes, maximum 100 MB
- **PDF Header Validation**: Validates PDF magic bytes (`%PDF`)
- **Readability Check**: Ensures file is readable
- **Fail-Safe**: Invalid files are rejected, order marked as failed

### Duplicate Physical Print Prevention

- **Idempotency**: Each print job has unique `printJobId` (UUID)
- **Double Check**: Checks both `orders` and `print_logs` collections
- **Never Reprint**: Same `printJobId` is never printed twice, even if state reset
- **Absolute Guarantee**: Physical duplicates are impossible

### Admin Safety Guards

- **State Validation**: All admin actions validate state transitions
- **Required Reasons**: Reset and force-printed actions require reason
- **Confirmation**: Force-printed requires explicit confirmation
- **Logging**: All admin overrides logged with full context

### Fail-Safe Defaults

- **Conservative Approach**: When in doubt, don't print
- **Comprehensive Checks**: Before every print:
  - Printer online and not in error
  - File validation passed
  - Capability validation passed
  - State transition valid
  - Print attempt < max attempts
  - PrintJobId not already printed
- **Error Handling**: All unexpected errors reset to pending, don't print

## Production-Critical Features

### Print Job Idempotency

- Each print job has a unique `printJobId` (UUID)
- System checks if `printJobId` already printed before printing
- Prevents duplicate physical prints even on retries or server restarts
- `printAttempt` counter tracks retry attempts

### Worker Ownership

- Each server instance has a unique `workerId` (UUID + hostname + timestamp)
- Orders are claimed with `printingBy: workerId`
- Only the owning worker can complete or reset a job
- Supports multiple servers running simultaneously
- Prevents interference between workers

### Graceful Shutdown

- On shutdown (SIGTERM, SIGINT), server:
  - Finds all orders with `printStatus: 'printing'` AND `printingBy: workerId`
  - Resets them to `'pending'` with reason "Server shutdown"
  - Logs each reset to `print_logs`
  - Ensures no jobs are left stuck

### Capability Validation

- Validates orders against printer capabilities before claiming:
  - Page size (A3 vs A4)
  - Color support
  - Duplex support
  - Max copies
- Orders that don't match capabilities are skipped with error message

### File Integrity Validation

- Validates files before printing:
  - File exists
  - Minimum file size (100 bytes)
  - Valid PDF header (%PDF)
- Invalid files are rejected with clear error messages

### Observability & Metrics

- Tracks system metrics:
  - `prints_per_hour`: Number of successful prints in last hour
  - `failures_per_hour`: Number of failed prints in last hour
  - `average_print_start_delay`: Average time from order creation to printing start (seconds)
  - `printer_offline_duration`: Total time printer was offline in last hour (seconds)
- Metrics stored in MongoDB every 5 minutes
- Old metrics cleaned up after 7 days
- Viewable in admin monitor UI

## Troubleshooting

### Printer Not Found

1. Verify printer name matches exactly (case-sensitive):
   ```powershell
   wmic printer get name
   ```

2. Check printer is online in Windows Settings

3. Verify printer drivers are installed

### MongoDB Connection Error

1. Check `MONGODB_URI` is correct
2. Verify MongoDB is running
3. Check network connectivity
4. Verify database user has read/write permissions

### Orders Not Processing

1. Check printer status in MongoDB:
   ```javascript
   db.printers.find({ isActive: true })
   ```

2. Verify orders have `printStatus: 'pending'` and `paymentStatus: 'completed'`

3. Check server logs for errors

4. Verify printer is online and not in error state

5. Check for capability mismatches (page size, color, duplex)

6. Verify file URLs are accessible and valid

### Print Jobs Failing

1. Check printer error messages in MongoDB
2. Verify file URLs are accessible
3. Check printer has paper and ink
4. Review server logs for detailed error messages
5. Check file validation errors (size, PDF header)
6. Verify printer capabilities match order requirements

### Duplicate Prints

- System prevents duplicates using `printJobId`
- If you see duplicates, check:
  - Are multiple `printJobId` values for the same order?
  - Is idempotency check working?
  - Review `print_logs` for duplicate print attempts

### Stuck Orders

- Orders stuck in `printing` state for > 30 minutes are auto-reset
- On server shutdown, orders owned by that worker are reset
- Check `print_logs` for reset reasons
- Verify worker ownership: `db.orders.find({ printStatus: 'printing' })`

### Metrics Not Updating

- Metrics are stored every 5 minutes
- Check MongoDB `metrics` collection:
  ```javascript
  db.metrics.find().sort({ timestamp: -1 }).limit(1)
  ```
- Verify metrics collector is running (check server logs)

## Monitoring

### View Printer Status

Check MongoDB `printers` collection:
```javascript
db.printers.find().pretty()
```

### View Order Status

Check MongoDB `orders` collection:
```javascript
db.orders.find({ printStatus: 'pending' }).pretty()
```

### View Print Logs

Check MongoDB `print_logs` collection:
```javascript
db.print_logs.find().sort({ timestamp: -1 }).limit(10).pretty()
```

## Admin Actions

Admins can perform actions via the website admin panel:

- **Reprint**: Reset failed order to pending
- **Cancel**: Cancel pending order
- **Reset**: Reset stuck printing order to pending
- **Force Printed**: Manually mark order as printed

All actions are logged to `print_logs` collection.

## Auto-Restart

For production, use a process manager like PM2:

```bash
npm install -g pm2
pm2 start dist/index.js --name printing-server
pm2 save
pm2 startup
```

## Development

### Project Structure

```
Printing-Server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config/
│   │   └── mongodb.ts        # MongoDB connection
│   ├── services/
│   │   ├── orderProcessor.ts # Process pending orders
│   │   ├── printerHealth.ts  # Health monitoring
│   │   └── printExecutor.ts  # Actual printing logic
│   ├── models/
│   │   ├── Order.ts          # Order model
│   │   └── Printer.ts        # Printer model
│   └── utils/
│       ├── atomicUpdate.ts   # Atomic state transitions
│       └── printerDriver.ts  # OS-specific printer access
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build
```

Output will be in `dist/` directory.

## License

MIT

## Support

For issues or questions, contact the development team.

