import { useEffect, useState } from "react";
import "../publicVerify.css";
import { Contract, JsonRpcProvider, Network } from "ethers";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  RPC_URL,
  formatDate,
  toWarrantyObject,
} from "../App";

// Read the serial from /verify/WC-1  (or /verify?serial=WC-1)
function getSerial() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === "verify" && parts[1]) return decodeURIComponent(parts[1]);
  return new URLSearchParams(window.location.search).get("serial") || "";
}

// Public, read-only page shown when someone scans a QR code.
// No wallet, no MetaMask, no dashboard, no links into the app.
export default function PublicVerify() {
  const serial = getSerial();
  const [state, setState] = useState({ status: "loading", warranty: null, error: "" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!serial) {
        setState({ status: "error", warranty: null, error: "No product ID in this QR code." });
        return;
      }
      try {
        const provider = new JsonRpcProvider(RPC_URL, undefined, {
          staticNetwork: Network.from(5778),
        });
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const raw = await contract.getWarrantyBySerialNumber(serial);
        if (!cancelled) setState({ status: "ok", warranty: toWarrantyObject(raw), error: "" });
      } catch (error) {
        console.error(error);
        const text = String(error?.reason || error?.shortMessage || error?.message || "");
        const notFound = /not registered/i.test(text);
        if (!cancelled)
          setState({
            status: notFound ? "notfound" : "error",
            warranty: null,
            error: notFound
              ? ""
              : "Could not reach the blockchain. Make sure this device is on the same network as the server.",
          });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [serial]);

  const w = state.warranty;
  const active = w && w.expiry * 1000 >= Date.now();
  const days = w && active ? Math.ceil((w.expiry * 1000 - Date.now()) / 86400000) : 0;

  return (
    <div className="pv-page">
      <div className="pv-card">
        <div className="pv-brand">
          <span className="brand-shield">✓</span>
          <span>WarrantyChain</span>
        </div>

        {state.status === "loading" && <div className="pv-msg">Checking the blockchain…</div>}

        {state.status === "notfound" && (
          <div className="pv-msg bad">
            <strong>Product not found</strong>
            <span>No record exists for “{serial}”. This receipt may be fake.</span>
          </div>
        )}

        {state.status === "error" && (
          <div className="pv-msg bad">
            <strong>Unable to verify</strong>
            <span>{state.error}</span>
          </div>
        )}

        {state.status === "ok" && w && (
          <>
            <div className={`pv-banner ${active ? "ok" : "expired"}`}>
              <span className="pv-tick">{active ? "✓" : "!"}</span>
              <div>
                <strong>{active ? "Warranty active" : "Warranty expired"}</strong>
                <small>
                  {active ? `${days} days remaining` : `Ended on ${formatDate(w.expiry)}`}
                </small>
              </div>
            </div>

            <h1>{w.productName}</h1>
            <p className="pv-sub">Verified on the blockchain</p>

            <dl className="pv-list">
              <div><dt>Product ID</dt><dd>{w.serialNumber}</dd></div>
              <div><dt>Receipt number</dt><dd>{w.receiptNumber}</dd></div>
              <div><dt>Customer</dt><dd>{w.customerName || "—"}</dd></div>
              <div><dt>Seller</dt><dd>{w.sellerName || "—"}</dd></div>
              <div><dt>Purchase date</dt><dd>{formatDate(w.purchaseDate)}</dd></div>
              <div><dt>Valid until</dt><dd>{formatDate(w.expiry)}</dd></div>
            </dl>
          </>
        )}
      </div>
    </div>
  );
}