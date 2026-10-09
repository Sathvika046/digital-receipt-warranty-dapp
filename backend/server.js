require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const warrantyRoutes = require("./routes/warrantyRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors());
app.use(express.json());


// =====================================================
// WARRANTY API ROUTES
// =====================================================
app.use("/api/warranties", warrantyRoutes);

// CONTACT FORM (sends email through SMTP)
app.use("/api/contact", contactRoutes);


// =====================================================
// HEALTH CHECK
// =====================================================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
  });
});


// =====================================================
// START SERVER
// =====================================================
const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(
      `Backend server running on http://localhost:${PORT}`
    );
  });
}

startServer();