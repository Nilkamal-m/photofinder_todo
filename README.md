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
| 🌿 Public Studio Page | Hero story, published packages, budget estimate, and enquiry form for visitors |
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
│   │   ├── enquiries.js          # Public enquiry submissions
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
            ├── LandingScreen.js   # Public studio landing page
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

### Services, assignments and wallets

The service form offers suggested names or a custom name, searchable unit/type dropdowns, and expenses added through a small editor. Custom service types are stored for future use and can be renamed or deleted through **Manage types**. Deleting a type moves its services to Other. Deleting a service archives it so saved package references remain intact.

The server calculates the client rate as the sum of expenses plus either a percentage markup on that sum or a fixed profit amount. Existing services retain their previous rate until edited in the new form. Existing bills keep their saved rates and costs.

Assign each service to a registered studio user in the bill’s final **Review & assign** step. Unassigned services do not create wallet credits. The wallet amount is the service’s rate multiplied by quantity, before bill-level discounts. It is pending until the bill owner marks that service delivered on the invoice. Client payment status is separate from delivery. Reopening delivery reverses the settlement. Reopen a delivered service before changing its assignee, quantity or rate.

**Wallets** shows each user’s pending credits, settled work, payments and main balance (settled work minus recorded payments). Members see only their own wallet; admins can view all wallets and create, edit or delete payment records. These records describe money already paid; they do not transfer money. A negative main balance means payments exceed currently settled work.

Bill changes recalculate credits directly from the saved services. Deleting a draft removes its pending credits; cancelling or deleting any bill removes its earnings. Payment records remain until explicitly edited or deleted. Earlier name-based cost records are preserved separately; they are not automatically matched to registered users.

Run `cd backend && npm test` for the pricing, bill, delivery, wallet, access-control and CRUD regression checks. Restart the backend after updating these routes and models.
