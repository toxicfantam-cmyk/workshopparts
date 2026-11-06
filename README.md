# WorkshopParts — Workshop Spare Parts Inventory & Repair Job Management System

**WorkshopParts** is a full-stack SaaS platform designed for automotive repair workshops to manage spare parts inventory, monitor stock levels, link parts to repair tickets, track purchase requests, and automatically resolve jobs delayed by part shortages.

---

## 🚀 Key Highlights & Business Capabilities

1. **Automated Inventory Availability Check & Reservations**
   - Automatically checks real-time available stock (`Total - Reserved`) when parts are assigned to a repair job.
   - If stock is sufficient, reserves the quantities and advances the job to **"In Progress"**.
   - If any required part is unavailable, immediately flags the job as **"Waiting for Parts"** and calculates exact component shortages.

2. **Shortage-Driven Procurement Workflow**
   - 1-click generation of Purchase Requests directly from repair job shortages or low-stock alerts.
   - Pre-fills missing quantities, estimated purchase prices, and authorized supplier mappings.
   - Tracks approval, ordering, and delivery.

3. **Intelligent Stock Receipt & Auto-Fulfillment**
   - Supports full and partial deliveries against Purchase Orders.
   - Automatically increments physical inventory and records immutable stock movement audit logs.
   - **Auto-Reservation:** Checks all waiting repair jobs requiring the incoming parts, reserves the new units, and automatically promotes satisfied jobs to **"In Progress"**.

4. **Auditable Inventory Movements**
   - Full transaction history with movement IDs (`MOV-YYYY-XXXXX`), movement types (`RECEIVED`, `ISSUED`, `RESERVED`, `RELEASED`, `ADJUSTMENT`), before/after counts, and user attribution.
   - Cycle count adjustment and write-off tools with strict validation preventing negative stock.

5. **Executive KPI Dashboard & Analytics**
   - Total stock valuation in Indian Rupees (₹), low-stock warnings, active repair tickets, and pending purchase orders.
   - Interactive Recharts visualizations: Category Distribution Donut, Monthly Movement Trends (Received vs Issued), and Repair Pipeline Breakdown.

6. **Role-Based Access Control (RBAC)**
   - **Admin:** Complete system configuration, user management, order approvals, and deletions.
   - **Inventory Manager:** Parts catalogue, stock adjustments, purchase requests, and supplier management.
   - **Technician:** View assigned jobs, inspect required parts availability, and update job execution statuses.

---

## 🛠 Tech Stack

- **Frontend:** React 18, Vite 6, Tailwind CSS, Lucide React icons, Recharts
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose (with embedded `MongoMemoryServer` zero-config fallback if local mongod is not running)
- **Authentication:** JWT with bcrypt password hashing
- **API Client:** Axios with bearer token interceptors

---

## 📂 Project Architecture

```
backend cia 2/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection with embedded fallback
│   │   ├── models/
│   │   │   ├── User.js               # User accounts & RBAC
│   │   │   ├── Supplier.js           # Automotive suppliers
│   │   │   ├── Part.js               # Spare parts with SKU, bins, stock & pricing
│   │   │   ├── RepairJob.js          # Workshop repair tickets & required parts
│   │   │   ├── PurchaseRequest.js    # Procurement purchase orders
│   │   │   └── StockMovement.js      # Immutable inventory audit log
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification & role authorization
│   │   │   └── errorHandler.js       # Central error handling & validation formatting
│   │   ├── controllers/              # RESTful API controllers for each module
│   │   ├── routes/                   # Express routes
│   │   ├── services/
│   │   │   └── inventoryService.js   # Automated shortage checks & auto-reservation
│   │   ├── seed/
│   │   │   ├── seedData.js           # 20+ Indian workshop parts, 5 suppliers, 10 jobs
│   │   │   └── seeder.js             # Database seeder utility
│   │   ├── test-workflow.js          # Automated end-to-end verification script
│   │   └── server.js                 # Express server bootstrap
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/               # Button, Modal, Badge, StatCard, EmptyState, etc.
│   │   │   ├── layout/               # Sidebar, Topbar, Layout navigation
│   │   │   └── widgets/              # GlobalSearchModal (Cmd+K), QuickActionsModal
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # Authentication & session provider
│   │   │   └── NotificationContext.jsx # Toast notification system
│   │   ├── pages/
│   │   │   ├── Login.jsx             # Sign-in with 1-click quick demo accounts
│   │   │   ├── Dashboard.jsx         # Executive overview & charts
│   │   │   ├── PartsCatalogue.jsx    # Complete parts directory with stock tabs
│   │   │   ├── Inventory.jsx         # Stock movements audit & adjustments
│   │   │   ├── RepairJobs.jsx        # Workshop jobs pipeline
│   │   │   ├── RepairJobDetail.jsx   # Deep ticket inspection & shortage table
│   │   │   ├── PurchaseRequests.jsx  # Procurement workflows & stock receipts
│   │   │   ├── Suppliers.jsx         # Supplier directory & metrics
│   │   │   ├── Alerts.jsx            # Low-stock & job shortage alert hub
│   │   │   └── Reports.jsx           # Valuation, consumption & CSV export
│   │   ├── services/api.js           # Axios API methods
│   │   ├── utils/                    # Currency ₹ formatting, CSV exporter
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── package.json                      # Root scripts to run client & server concurrently
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Install Dependencies
From the project root:
```bash
npm run install:all
```

### 3. Environment Configuration
The backend includes a pre-configured `.env` file:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/workshopparts
JWT_SECRET=supersecret_workshopparts_jwt_key_2025
JWT_EXPIRES_IN=7d
NODE_ENV=development
```
> **Zero-Config Database:** If a local MongoDB instance is not detected, the backend will automatically spin up an embedded `MongoMemoryServer` and auto-seed it with demo data!

### 4. Run the Full Application (Frontend + Backend)
From the root folder:
```bash
npm run dev
```
Or start each service separately:
- **Backend:** `npm run server` (runs on `http://localhost:5001`)
- **Frontend:** `npm run client` (runs on `http://localhost:3000`)

---

## 🔑 Demo Login Accounts

Quick 1-click login buttons are provided on the login page:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@workshopparts.com` | `admin123` | Full access, PO approvals, deletions |
| **Inventory Manager** | `manager@workshopparts.com` | `manager123` | Parts, stock adjustments, PRs, stock receipts |
| **Technician** | `rajesh.tech@workshopparts.com` | `tech123` | View assigned jobs, inspect parts availability, update status |

---

## 🔄 End-to-End Workflow Demonstration

To test the complete 10-step workflow required by the specification:

1. **Sign in** as **Inventory Manager** (`manager@workshopparts.com`).
2. Navigate to **Repair Jobs** and click **"+ Create Repair Job"**.
3. Select **2 units** of `PRT-BRK-001` (Front Ceramic Brake Pads Set) and **1 unit** of `PRT-FLT-001` (Oil Filter).
4. Click **"Create & Validate Inventory"**.
5. **Observation:** The system checks available stock. Because `PRT-BRK-001` has 0 available units, the job is automatically set to **"Waiting for Parts"**.
6. Click into the job details: notice the exact shortage (`-2 Missing`) highlighted in red.
7. Click **"Generate Purchase Request"**: a PO modal opens with the required brake pads and Bosch supplier pre-filled.
8. Submit the Purchase Request (`PR-202X-XXXX`).
9. Log in as **Admin** (or click Approve) to approve the PO, then mark it as **Ordered**.
10. Click **"Receive Stock"**, verify the delivery note, and record receipt of the parts.
11. **Result:** The system adds the stock, logs `StockMovement` records, automatically reserves the needed 2 units for the waiting job, and transitions the job to **"In Progress"**!

### Automated Verification Script
You can also run the automated end-to-end verification test anytime:
```bash
cd backend && node src/test-workflow.js
```
Expected output:
```
🎉 ALL 10 STEPS OF THE END-TO-END WORKFLOW PASSED WITH 100% SUCCESS!
```

---

## 📊 Modules & Capabilities

1. **Dashboard:** KPI summary, stock valuation in ₹, Recharts charts, low-stock warnings carousel, quick action launcher.
2. **Parts Catalogue:** SKU management, rack/shelf/bin mapping, vehicle compatibility tags, cost vs retail prices, stock status tabs.
3. **Inventory Management:** Full stock movements audit log (`RECEIVED`, `ISSUED`, `RESERVED`, `RELEASED`, `ADJUSTMENT`), manual stock count adjustments.
4. **Repair Jobs:** Multi-part allocation, technician assignments, real-time shortage detection, full lifecycle status tracking.
5. **Purchase Requests:** Multi-item purchase orders, status progression (`Draft` → `Pending Approval` → `Approved` → `Ordered` → `Partially Received` → `Received`), stock receipt with auto-reservation.
6. **Suppliers:** Directory of OEM component suppliers, ratings, payment terms, supplied categories, and order history.
7. **Stock Alerts Hub:** Instant detection of out-of-stock items, low-stock items, and jobs blocked by shortages.
8. **Reports & Analytics:** Inventory valuation at cost vs retail, parts consumption breakdown, delayed jobs report, procurement spend analysis, and 1-click **CSV Export**.
