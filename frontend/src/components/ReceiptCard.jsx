import { formatDate } from "../App";
import { getInvoice } from "../invoiceUtils";

function Thumb({ warranty, className = "product-thumb" }) {
  const photo = getInvoice(warranty.receiptNumber)?.thumbnail;

  return (
    <div className={className}>
      {photo ? (
        <img src={photo} alt={warranty.productName} />
      ) : (
        warranty.productName.slice(0, 1).toUpperCase()
      )}
    </div>
  );
}

export { Thumb };

export default function ReceiptCard({
  warranty,
  onOpen,
  mode = "warranty",
}) {
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

  // =====================================================
  // MY RECEIPTS CARD
  // =====================================================

  if (mode === "receipt") {
    return (
      <button
        className="warranty-card"
        onClick={() => onOpen(warranty)}
      >
        <Thumb warranty={warranty} />

        <div className="warranty-card-main">

          <div className="card-product-row">
            <h3>
              {warranty.productName}
            </h3>
          </div>

          <p>
            Product ID:{" "}
            <strong>
              {warranty.serialNumber}
            </strong>
          </p>

          <p>
            Receipt Number:{" "}
            <strong>
              {warranty.receiptNumber}
            </strong>
          </p>

          <p>
            Purchase Date:{" "}
            {formatDate(warranty.purchaseDate)}
          </p>

          <div className="card-bottom">

            <span>
              Digital purchase record
            </span>

            <b>
              View Receipt →
            </b>

          </div>

        </div>
      </button>
    );
  }

  // =====================================================
  // MY WARRANTIES CARD
  // =====================================================

  return (
    <button
      className="warranty-card"
      onClick={() => onOpen(warranty)}
    >
      <Thumb warranty={warranty} />

      <div className="warranty-card-main">

        <div className="card-product-row">

          <h3>
            {warranty.productName}
          </h3>

          <span
            className={`status-pill ${
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

        <p>
          Product ID:{" "}
          <strong>
            {warranty.serialNumber}
          </strong>
        </p>

        <p>
          Purchase Date:{" "}
          {formatDate(
            warranty.purchaseDate
          )}
        </p>

        <p>
          Warranty Valid Until:{" "}
          {formatDate(warranty.expiry)}
        </p>

        <div className="card-bottom">

          <span>
            {active
              ? `${days} days remaining`
              : "Warranty expired"}
          </span>

          <b>
            View Warranty →
          </b>

        </div>

      </div>
    </button>
  );
}