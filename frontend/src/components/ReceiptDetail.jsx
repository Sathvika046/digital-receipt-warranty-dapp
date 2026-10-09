import { useMemo, useState } from "react";
import { Contract } from "ethers";
import { QRCodeCanvas } from "qrcode.react";

import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  formatDate,
  shortAddress,
  verifyUrlFor,
} from "../App";
import { Thumb } from "./ReceiptCard";

export default function ReceiptDetail({
  warranty,
  provider,
  onBack,
  mode = "warranty",
}) {
  const [copied, setCopied] = useState("");

  const active =
    warranty.expiry * 1000 >= Date.now();

  const days = active
    ? Math.max(
        0,
        Math.ceil(
          (warranty.expiry * 1000 - Date.now()) /
            86400000
        )
      )
    : 0;

  const verifyUrl = verifyUrlFor(warranty.serialNumber);

  useMemo(
    () =>
      new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      ),
    [provider]
  );

  const copy = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);

      setCopied(label);

      setTimeout(() => {
        setCopied("");
      }, 1200);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <div className="detail-page">

      {/* =====================================================
          BACK BUTTON
          ===================================================== */}

      <button
        className="back-link"
        onClick={onBack}
      >
        ← Back to{" "}
        {mode === "receipt"
          ? "Receipts"
          : "Warranties"}
      </button>


      {/* =====================================================
          PRODUCT HEADER
          ===================================================== */}

      <div className="detail-hero-card content-card">

        <Thumb
          warranty={warranty}
          className="detail-product-icon"
        />

        <div className="detail-title">

          <h1>
            {warranty.productName}
          </h1>

          <p>
            Product ID:{" "}
            {warranty.serialNumber}
          </p>

          <p>
            Purchase Date:{" "}
            {formatDate(
              warranty.purchaseDate
            )}
          </p>

          <p>
            Warranty Period:{" "}
            {formatDate(
              warranty.purchaseDate
            )}{" "}
            —{" "}
            {formatDate(warranty.expiry)}
          </p>

        </div>

        <span
          className={`status-pill large ${
            active
              ? "active"
              : "expired"
          }`}
        >
          <i />

          {active
            ? "Active"
            : "Expired"}
        </span>

      </div>


      {/* =====================================================
          RECEIPT + WARRANTY DETAILS
          ===================================================== */}

      <div className="detail-columns">

        {/* =================================================
            RECEIPT DETAILS
            ================================================= */}

        <div className="content-card detail-info-card">

          <h2>Receipt Details</h2>

          <Info
            label="Receipt Number"
            value={
              warranty.receiptNumber
            }
          />

          <Info
            label="Product Serial"
            value={
              warranty.serialNumber
            }
          />

          <Info
            label="Purchase Date"
            value={formatDate(
              warranty.purchaseDate
            )}
          />

          <Info
            label="Customer"
            value={shortAddress(
              warranty.customer
            )}
            copy={() =>
              copy(
                "customer",
                warranty.customer
              )
            }
            copied={
              copied === "customer"
            }
          />

          <Info
            label="Seller"
            value={shortAddress(
              warranty.seller
            )}
            copy={() =>
              copy(
                "seller",
                warranty.seller
              )
            }
            copied={
              copied === "seller"
            }
          />

        </div>


        {/* =================================================
            WARRANTY DETAILS
            ================================================= */}

        <div className="content-card detail-info-card">

          <h2>Warranty Details</h2>

          <Info
            label="Start Date"
            value={formatDate(
              warranty.purchaseDate
            )}
          />

          <Info
            label="End Date"
            value={formatDate(
              warranty.expiry
            )}
          />

          <Info
            label="Remaining"
            value={
              active
                ? `${days} days`
                : "Expired"
            }
          />

          <Info
            label="Status"
            value={
              active
                ? "Active"
                : "Expired"
            }
          />

        </div>

      </div>


      {/* =====================================================
          WARRANTY TIMELINE + QR

          IMPORTANT:
          These are shown ONLY inside Warranties.

          They are NOT shown inside My Receipts.
          ===================================================== */}

      {mode === "warranty" && (
        <div className="detail-columns lower">

          {/* =================================================
              WARRANTY TIMELINE
              ================================================= */}

          <div className="content-card timeline-card">

            <h2>
              Warranty Timeline
            </h2>

            <Timeline
              active={active}
              purchase={
                warranty.purchaseDate
              }
              expiry={
                warranty.expiry
              }
            />

          </div>


          {/* =================================================
              QR CODE
              ================================================= */}

          <div className="content-card qr-card">

            <div>

              <h2>
                Verify this Product
              </h2>

              <p>
                Scan this QR code to
                open the verification
                record.
              </p>

            </div>

            <QRCodeCanvas
              value={verifyUrl}
              size={150}
              bgColor="#ffffff"
              fgColor="#12245b"
            />

          </div>

        </div>
      )}

    </div>
  );
}


/* =========================================================
   INFO ROW
   ========================================================= */

function Info({
  label,
  value,
  copy,
  copied,
}) {
  return (
    <div className="info-row">

      <span>
        {label}
      </span>

      <strong>

        {value}

        {copy && (
          <button
            className="tiny-copy"
            onClick={copy}
            type="button"
          >
            {copied
              ? "✓"
              : "□"}
          </button>
        )}

      </strong>

    </div>
  );
}


/* =========================================================
   WARRANTY TIMELINE
   ========================================================= */

function Timeline({
  active,
  purchase,
  expiry,
}) {
  const days = active
    ? Math.max(
        0,
        Math.ceil(
          (expiry * 1000 -
            Date.now()) /
            86400000
        )
      )
    : 0;

  return (
    <div className="timeline">

      {/* WARRANTY ISSUED */}

      <div className="timeline-item done">

        <span>
          ✓
        </span>

        <div>

          <strong>
            Warranty Issued
          </strong>

          <small>
            {formatDate(purchase)}
          </small>

        </div>

      </div>


      {/* PRODUCT VERIFIED */}

      <div className="timeline-item done">

        <span>
          ✓
        </span>

        <div>

          <strong>
            Product Verified
          </strong>

          <small>
            Record found on blockchain
          </small>

        </div>

      </div>


      {/* ACTIVE / COMPLETED */}

      <div
        className={`timeline-item ${
          active
            ? "current"
            : "done"
        }`}
      >

        <span>
          {active
            ? "●"
            : "✓"}
        </span>

        <div>

          <strong>
            {active
              ? "Active Warranty"
              : "Warranty Period Completed"}
          </strong>

          <small>
            {active
              ? `${days} days remaining`
              : `Warranty was valid until ${formatDate(
                  expiry
                )}`}
          </small>

        </div>

      </div>


      {/* WARRANTY EXPIRY */}

      <div
        className={`timeline-item ${
          active
            ? "upcoming"
            : "expired"
        }`}
      >

        <span>
          {active
            ? "○"
            : "!"}
        </span>

        <div>

          <strong>
            Warranty Expiry
          </strong>

          <small>
            {active
              ? `Expires on ${formatDate(
                  expiry
                )}`
              : `Expired on ${formatDate(
                  expiry
                )}`}
          </small>

        </div>

      </div>

    </div>
  );
}