# 📸 PhotoFinder Billing App

A full-stack billing & agreement management app for photography studios.

## Stack
- **Frontend**: React Native Web (Expo)
- **Backend**: Express.js + Node.js
- **Database**: MongoDB Atlas

---

## 🚀 Quick Start

```bash
cd /Users/nilkamalmahato/Documents/photofinder_todo
./start.sh
```

Or run separately:

### Backend
```bash
cd backend
npm install
npm run dev      # Runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run web      # Runs on http://localhost:8085
```

---

## 🌐 MongoDB Atlas IP Whitelist Setup

If connecting to MongoDB Atlas directly:
1. Log into [cloud.mongodb.com](https://cloud.mongodb.com)
2. Under **Security**, click **Network Access**
3. Click **Add IP Address**
4. Choose **Allow Access From Anywhere** (`0.0.0.0/0`) or add your current IP (`106.192.80.159`)
5. If Atlas is temporarily unreachable, the app automatically runs on an embedded in-memory database fallback so you can test immediately without interruption!

---

## 🔑 First Time Setup

### 1. Create Admin Account
On the Login screen, tap **"Register"** and check **"Register as Admin"**.
Use the Admin Setup Key: `admin123setup`

### 2. Seed Sample Price Items
After logging in as admin, go to **Price List** → tap **"Seed"** to add sample items.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Login | JWT auth, role-based (admin / user) |
| 💰 Price List | Admin can add/edit/delete per-item prices with cost (admin-only) & selling price |
| 📦 Packages | Build packages by selecting items + quantities |
| 👥 Clients | Manage client info (name, phone, event type, venue, date) |
| 🧾 Bill Generator | 4-step wizard: Client → Services → Agreement → Review |
| 🧮 Estimation Calculator | Compare totals, discounts, safe margins, and estimated profit before billing |
| 📅 Important Dates | Check availability, identify client bookings, and block studio dates |
| 📄 Agreement | Auto-generated agreement with customizable terms & conditions |
| 📤 Secure Sharing | Share bill via unique link — only the specified phone can view it |
| 💰 Profit (Admin) | Profit margin only visible to admin role |

---

## 🔗 Sharing a Bill

1. Create a bill
2. Go to **Bills** → tap **📤 Share** on any bill
3. Enter the client's phone number
4. Copy the generated link and send it via WhatsApp/SMS
5. The client opens the link and enters their phone to verify

---

## 📁 Project Structure

```
photofinder_todo/
├── backend/
│   ├── server.js              # Express app entry
│   ├── .env                   # MongoDB URI, JWT secret
│   ├── models/
│   │   ├── User.js            # User with role (admin/user)
│   │   ├── PriceItem.js       # Services with selling + cost price
│   │   ├── Package.js         # Package of price items
│   │   ├── Client.js          # Client info + event details
│   │   └── Bill.js            # Bill with agreement + sharing
│   ├── routes/
│   │   ├── auth.js            # Login, register, JWT
│   │   ├── prices.js          # Price item CRUD
│   │   ├── packages.js        # Package CRUD
│   │   ├── clients.js         # Client CRUD
│   │   └── bills.js           # Bill CRUD + sharing
│   └── middleware/
│       └── auth.js            # JWT protect + adminOnly
└── frontend/
    ├── App.js                 # Navigation setup
    └── src/
        ├── context/
        │   └── AuthContext.js # Global auth state
        ├── services/
        │   └── api.js         # Axios with auto-token
        └── screens/
            ├── LoginScreen.js
            ├── HomeScreen.js
            ├── PriceListScreen.js
            ├── PackagesScreen.js
            ├── ClientsScreen.js
            ├── BillsScreen.js
            ├── EstimationScreen.js  # Price and discount calculator
            ├── DatesScreen.js       # Availability checks and blocked dates
            ├── CreateBillScreen.js  # 4-step bill wizard
            ├── BillDetailScreen.js  # Printable bill view
            └── SharedBillScreen.js  # Public bill (phone-gated)
```

---

## 🔐 Admin Setup Key
Default: `admin123setup`
Change it in `backend/.env` → `ADMIN_SETUP_KEY=your_key`

## ⚙️ Environment Variables

Backend variables belong in `backend/.env`. Start from `backend/.env.example`:

- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: long random secret used to sign login tokens.
- `PORT`: API port, normally `3001`.
- `ADMIN_SETUP_KEY`: private key required to register an admin account.
- `CORS_ORIGINS`: comma-separated frontend origins, such as `http://localhost:8085`.

The frontend uses Expo's public variable convention. Create `frontend/.env` with:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

For production, replace that value with the deployed API URL and add the deployed frontend origin to `CORS_ORIGINS`. Never put MongoDB credentials, JWT secrets, or admin setup keys in frontend environment variables.

## 🛡️ Security
- JWT tokens expire in 7 days
- Shared bills are phone-locked (only the specific phone can view)
- Profit/cost price fields are stripped server-side for non-admin users
- Admin endpoints protected with `adminOnly` middleware

### Service costs and team payments

Admins can add cost components to a service in **Price list**. Each amount uses the service's unit (for example, a per-minute service has per-minute costs). Components replace the legacy base cost when present. Assign a person to a component to track what they earn.

Saving a bill snapshots the service's current costs and assignments. Costs are multiplied by the billed quantity. Client-facing bills hide internal costs and assignments. Existing bills retain their saved costs when prices change; legacy bills do not gain assignments retroactively.

Open **Team payments** to see assigned amounts, recorded payments, and balances. Cancelled and deleted bills do not contribute to earnings; recorded payments remain. Names are grouped without regard to letter case. Use consistent names for each person. Recording a payment tracks money already paid; it does not transfer money.

Cost checks: `node --test backend/tests/costs.test.js`.
