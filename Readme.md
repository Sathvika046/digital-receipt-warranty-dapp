# 🔗 WarrantyChain — Blockchain-Based Digital Receipt & Warranty System

A full-stack decentralized application (dApp) that lets sellers issue **tamper-proof digital receipts and product warranties** on the blockchain, and lets anyone **verify a product's warranty instantly** by serial number or QR code — no sign-in required.

Built with **React + Solidity + Node/Express + MongoDB**, deployed locally on **Ganache** and connected through **MetaMask**.

---

## ✨ Features

- **Seller registration of warranties** — product name, receipt number, customer, purchase date and expiry are stored on-chain (only the contract owner can register).
- **Auto-generated product serial numbers** — the smart contract issues IDs like `WC-1`, `WC-2`, …
- **Instant verification** — look up a warranty by ID or serial number and see whether it is *active* or *expired*, plus remaining days.
- **QR codes** — every receipt gets a QR code that opens a public, read-only verification page (`/verify/<serial>`).
- **Invoice checks** — invoice upload with OCR (Tesseract.js) and hash-based detection of invoices already used for another product.
- **MetaMask wallet login** with network (chain ID) validation.
- **Dashboard** — My Receipts, Warranties, Verify Product, Profile (editable seller name).
- **Landing page** — About, FAQ and a Contact form that sends email via SMTP (with honeypot + rate limiting).

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Solidity `0.8.34`, OpenZeppelin (`Ownable`), Hardhat 3 |
| Local chain | Ganache (chain ID) |
| Frontend | React 19, Vite, ethers v6, qrcode.react, Tesseract.js |
| Backend | Node.js, Express 5, Mongoose, Nodemailer, ethers v6 |
| Database | MongoDB |
| Wallet | MetaMask |

---

## 🏗️ Architecture

```
┌────────────┐   ethers.js / MetaMask   ┌──────────────────────┐
│  React UI  │ ───────────────────────► │  WarrantySystem.sol  │
│  (Vite)    │                          │  (Ganache / Sepolia) │
└─────┬──────┘                          └──────────────────────┘
      │ REST (contact form, warranty API)
      ▼
┌────────────┐        ┌──────────┐
│ Express API│ ─────► │ MongoDB  │
└────────────┘        └──────────┘
```

---

## 📁 Project Structure

```
BlockchainWarrantySystem/
├── blockchain/            # Hardhat project
│   ├── contracts/         # WarrantySystem.sol
│   ├── scripts/           # deploy.ts
│   ├── test/
│   └── hardhat.config.ts
├── backend/               # Express API
│   ├── config/db.js
│   ├── models/Warranty.js
│   ├── routes/            # warrantyRoutes.js, contactRoutes.js
│   ├── services/blockchain.js
│   └── server.js
└── frontend/              # React + Vite app
    └── src/
        ├── App.jsx
        └── components/    # Dashboard, PublicVerify, ReceiptCard, landing/ ...
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- [Ganache](https://trufflesuite.com/ganache/) 
- [MetaMask](https://metamask.io/) browser extension

### 1. Start Ganache

Run a Ganache instance on localhost with chain ID , then add that network to MetaMask and import one of the Ganache accounts.

### 2. Deploy the smart contract

```bash
cd blockchain
npm install
```

Create `blockchain/.env` if you plan to use Sepolia:

```env
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=
```

Deploy to Ganache:

```bash
npx hardhat run scripts/deploy.ts --network ganache
```

Copy the printed contract address.

### 3. Configure and run the backend

```bash
cd backend
npm install
```

Create a `backend/.env` file with your MongoDB connection string, Ganache RPC URL, a Ganache account private key, the deployed contract address and, optionally, SMTP settings for the contact form.

```bash
npm run dev
```

### 4. Configure and run the frontend

Set `CONTRACT_ADDRESS` in `frontend/src/App.jsx` to your deployed contract address, then:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5000**, click **Get Started**, and connect MetaMask (Ganache network, chain ID ).

> **Testing on a phone:** open the site via your PC's Wi-Fi IP or set `VITE_PUBLIC_URL`, so QR codes point to a reachable address. Optional env vars: `VITE_API_URL`, `VITE_RPC_URL`, `VITE_PUBLIC_URL`.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/warranties` | List warranties stored in MongoDB |
| `POST` | `/api/warranties/register` | Register a warranty |
| `GET` | `/api/warranties/serial/:serialNumber` | Look up by serial number |
| `GET` | `/api/warranties/:id` | Look up by warranty ID |
| `GET` | `/api/warranties/:id/valid` | Is the warranty still valid? |
| `GET` | `/api/warranties/:id/remaining-days` | Days remaining |
| `POST` | `/api/contact` | Send a contact-form email |

---

## 📜 Smart Contract

`WarrantySystem.sol` exposes:

- `registerWarranty(...)` — *owner only*; emits `WarrantyRegistered`
- `getWarranty(id)` / `getWarrantyBySerialNumber(serial)`
- `isWarrantyValid(id)` and `getRemainingWarrantyDays(id)`
- `warrantyExists(id)` and `nextWarrantyId()`

Compiled with the `shanghai` EVM target for Ganache compatibility.


## 🗺️ Roadmap

- Warranty transfer between owners
- Claim / service-request workflow
- Deployment to a public testnet (Sepolia)
- Automated contract tests