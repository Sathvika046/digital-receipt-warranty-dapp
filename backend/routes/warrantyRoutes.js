const express = require("express");
const router = express.Router();

const Warranty = require("../models/Warranty");
const { contract } = require("../services/blockchain");

// =====================================================
// GET ALL WARRANTIES FROM MONGODB
// =====================================================
router.get("/", async (req, res) => {
  try {
    const warranties = await Warranty.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      warranties,
    });
  } catch (error) {
    console.error("Get all warranties error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =====================================================
// REGISTER A NEW WARRANTY
// =====================================================
router.post("/register", async (req, res) => {
  try {
    const {
      productName,
      productSerialNumber,
      receiptNumber,
      customer,
      purchaseDate,
      warrantyExpiry,
    } = req.body;

    if (
      !productName ||
      !productSerialNumber ||
      !receiptNumber ||
      !customer ||
      !purchaseDate ||
      !warrantyExpiry
    ) {
      return res.status(400).json({
        success: false,
        message: "All warranty fields are required",
      });
    }

    // Convert dates to Unix timestamps
    const purchaseTimestamp = Math.floor(
      new Date(purchaseDate).getTime() / 1000
    );

    const expiryTimestamp = Math.floor(
      new Date(warrantyExpiry).getTime() / 1000
    );

    // Register warranty on blockchain
    const transaction = await contract.registerWarranty(
      productName,
      productSerialNumber,
      receiptNumber,
      customer,
      purchaseTimestamp,
      expiryTimestamp
    );

    const receipt = await transaction.wait();

    // Get the newly created warranty ID
    const warrantyId = await contract.nextWarrantyId().catch(() => null);

    const savedWarranty = await Warranty.create({
      warrantyId: warrantyId ? Number(warrantyId) - 1 : Date.now(),
      productName,
      productSerialNumber,
      receiptNumber,
      customer,
      seller: await contract.runner.getAddress(),
      purchaseDate: new Date(purchaseDate),
      warrantyExpiry: new Date(warrantyExpiry),
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });

    res.status(201).json({
      success: true,
      message: "Warranty registered successfully",
      warranty: savedWarranty,
      transactionHash: receipt.hash,
    });
  } catch (error) {
    console.error("Warranty registration error:", error);

    res.status(500).json({
      success: false,
      message: error.reason || error.message,
    });
  }
});


// =====================================================
// GET WARRANTY BY SERIAL NUMBER
// =====================================================
router.get("/serial/:serialNumber", async (req, res) => {
  try {
    const warranty = await contract.getWarrantyBySerialNumber(
      req.params.serialNumber
    );

    res.json({
      success: true,
      warranty: {
        warrantyId: Number(warranty[0]),
        productName: warranty[1],
        productSerialNumber: warranty[2],
        receiptNumber: warranty[3],
        customer: warranty[4],
        seller: warranty[5],
        purchaseDate: Number(warranty[6]),
        warrantyExpiry: Number(warranty[7]),
        exists: warranty[8],
      },
    });
  } catch (error) {
    console.error("Serial search error:", error);

    res.status(404).json({
      success: false,
      message: error.reason || error.message,
    });
  }
});


// =====================================================
// GET WARRANTY BY ID
// =====================================================
router.get("/:id", async (req, res) => {
  try {
    const warrantyId = Number(req.params.id);

    const warranty = await contract.getWarranty(warrantyId);

    res.json({
      success: true,
      warranty: {
        warrantyId: Number(warranty[0]),
        productName: warranty[1],
        productSerialNumber: warranty[2],
        receiptNumber: warranty[3],
        customer: warranty[4],
        seller: warranty[5],
        purchaseDate: Number(warranty[6]),
        warrantyExpiry: Number(warranty[7]),
        exists: warranty[8],
      },
    });
  } catch (error) {
    console.error("Get warranty error:", error);

    res.status(404).json({
      success: false,
      message: error.reason || error.message,
    });
  }
});


// =====================================================
// CHECK WARRANTY VALIDITY
// =====================================================
router.get("/:id/valid", async (req, res) => {
  try {
    const warrantyId = Number(req.params.id);

    const valid = await contract.isWarrantyValid(warrantyId);

    res.json({
      success: true,
      warrantyId,
      valid,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.reason || error.message,
    });
  }
});


// =====================================================
// GET REMAINING WARRANTY DAYS
// =====================================================
router.get("/:id/remaining-days", async (req, res) => {
  try {
    const warrantyId = Number(req.params.id);

    const days = await contract.getRemainingWarrantyDays(warrantyId);

    res.json({
      success: true,
      warrantyId,
      remainingDays: Number(days),
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.reason || error.message,
    });
  }
});


module.exports = router;