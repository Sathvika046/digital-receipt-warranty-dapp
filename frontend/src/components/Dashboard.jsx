import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, isAddress } from "ethers";
import { QRCodeCanvas } from "qrcode.react";

import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  formatDate,
  shortAddress,
  toWarrantyObject,
  verifyUrlFor,
  PUBLIC_URL,
} from "../App";

import ReceiptCard from "./ReceiptCard";
import ReceiptDetail from "./ReceiptDetail";
import "../dashboard-extra.css";

import {
  extractPurchaseDate,
  isInvoiceHashUsed,
  makeThumbnail,
  readInvoiceText,
  receiptNumberFromHash,
  saveInvoice,
  sha256File,
} from "../invoiceUtils";

const EMPTY_FORM = {
  productName: "",
  customerName: "",
  customer: "",
  warrantyMonths: "12",
};

// Accepts "WC-1", "wc-1", "wc1", "WC 1" or just "1" and returns "WC-1".
function normalizeSerial(input) {
  const t = String(input || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const m = t.match(/^(?:WC)?-?(\d+)$/);
  return m ? `WC-${Number(m[1])}` : t;
}

export default function Dashboard({
  account,
  provider,
  onLogout,
}) {
  const [activePage, setActivePage] =
    useState("Dashboard");

  const [warranties, setWarranties] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [selectedWarranty, setSelectedWarranty] =
    useState(null);

  const [selectedMode, setSelectedMode] =
    useState("warranty");

  const [verifiedWarranty, setVerifiedWarranty] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [issuing, setIssuing] =
    useState(false);

  const [invoiceFile, setInvoiceFile] =
    useState(null);
  const [productImage, setProductImage] = useState(null);

  const [verifyingInvoice, setVerifyingInvoice] =
    useState(false);

  const [ownerAddress, setOwnerAddress] =
    useState("");

  const [sellerName, setSellerName] =
    useState("");

  const [profileNameInput, setProfileNameInput] =
    useState("");

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const contract = useMemo(
    () =>
      new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      ),
    [provider]
  );

  // =====================================================
  // LOAD WARRANTIES + SELLER PROFILE
  // =====================================================

  const loadWarranties = useCallback(
    async () => {
      setLoading(true);
      setMessage("");

      try {
        const owner =
          await contract.owner();

        setOwnerAddress(owner);

        // Seller name is kept per wallet in the browser
        // (the deployed contract has no profile functions).
        let savedName = "";
        try {
          savedName =
            localStorage.getItem(`seller:${account.toLowerCase()}`) || "";
        } catch { /* storage unavailable */ }

        setSellerName(savedName);
        setProfileNameInput(savedName);

        // -----------------------------------------------
        // LOAD WARRANTY RECORDS
        // -----------------------------------------------

        const records = [];

        for (
          let id = 1;
          id <= 500;
          id += 1
        ) {
          try {
            const raw =
              await contract.getWarranty(id);

            const item =
              toWarrantyObject(raw);

            if (item.exists) {
              records.push(item);
            }
          } catch {
            break;
          }
        }

        const normalizedAccount =
          account.toLowerCase();

        const mine =
          records.filter(
            (item) =>
              item.customer &&
              item.customer.toLowerCase() ===
                normalizedAccount ||
              (item.seller &&
                item.seller.toLowerCase() ===
                  normalizedAccount)
          );

        setWarranties(mine);
      } catch (error) {
        console.error(error);

        setMessage(
          error?.shortMessage ||
            error?.reason ||
            "Could not load blockchain records."
        );
      } finally {
        setLoading(false);
      }
    },
    [account, contract]
  );

  useEffect(() => {
    loadWarranties();
  }, [loadWarranties]);

  // =====================================================
  // QR VERIFICATION URL
  // =====================================================

  useEffect(() => {
    const pathParts =
      window.location.pathname.split("/");

    if (
      pathParts[1] !== "verify" ||
      !pathParts[2]
    ) {
      return;
    }

    const serial =
      decodeURIComponent(pathParts[2]);

    setSearch(serial);
    setActivePage("Verify Product");

    contract
      .getWarrantyBySerialNumber(serial)
      .then((raw) => {
        setVerifiedWarranty(
          toWarrantyObject(raw)
        );
      })
      .catch((error) => {
        setVerifiedWarranty(null);

        setMessage(
          error?.reason ||
            error?.shortMessage ||
            "Product was not found on the blockchain."
        );
      });
  }, [contract]);

  // =====================================================
  // STATUS COUNTS
  // =====================================================

  const active =
    warranties.filter(
      (w) =>
        w.expiry * 1000 >= Date.now()
    );

  const expired =
    warranties.filter(
      (w) =>
        w.expiry * 1000 < Date.now()
    );

  // =====================================================
  // SEARCH
  // =====================================================

  const filtered =
    warranties.filter((item) => {
      const q =
        search.trim().toLowerCase();

      if (!q) return true;

      return (
        item.productName
          .toLowerCase()
          .includes(q) ||
        item.serialNumber
          .toLowerCase()
          .includes(q) ||
        item.receiptNumber
          .toLowerCase()
          .includes(q) ||
        (item.customerName || "")
          .toLowerCase()
          .includes(q) ||
        (item.sellerName || "")
          .toLowerCase()
          .includes(q)
      );
    });

  // =====================================================
  // NAVIGATION
  // =====================================================

  const go = (page) => {
    setActivePage(page);
    setSelectedWarranty(null);
    setSelectedMode("warranty");
    setMessage("");
    setMobileMenu(false);
  };

  // =====================================================
  // FORM
  // =====================================================

  const handleFormChange = (
    event
  ) => {
    setForm((old) => ({
      ...old,
      [event.target.name]:
        event.target.value,
    }));
  };

  // =====================================================
  // SAVE SELLER PROFILE
  // =====================================================

  const saveSellerProfile =
    async () => {
      const name =
        profileNameInput.trim();

      if (!name) {
        setMessage(
          "Please enter your profile name."
        );
        return false;
      }

      try {
        setSavingProfile(true);
        localStorage.setItem(`seller:${account.toLowerCase()}`, name);
        setSellerName(name);
        setProfileNameInput(name);
        setMessage("Seller profile saved successfully.");
        return true;
      } catch (error) {
        console.error(error);
        setMessage("Could not save seller profile.");
        return false;
      } finally {
        setSavingProfile(false);
      }
    };

  // =====================================================
  // ISSUE WARRANTY
  // =====================================================

  const issueWarranty =
    async (event) => {
      event.preventDefault();
      setMessage("");

      // -----------------------------------------------
      // VALIDATION
      // -----------------------------------------------

      if (
        !form.productName ||
        !form.customerName ||
        !form.customer
      ) {
        setMessage(
          "Please fill all required fields."
        );
        return;
      }

      if (!isAddress(form.customer)) {
        setMessage(
          "Enter a valid customer wallet address."
        );
        return;
      }

      if (!productImage) {
        setMessage(
          "Attach a photo of the product."
        );
        return;
      }

      if (!invoiceFile) {
        setMessage(
          "Attach the purchase invoice (image) before issuing the warranty."
        );
        return;
      }

      if (
        !ownerAddress ||
        ownerAddress.toLowerCase() !==
          account.toLowerCase()
      ) {
        setMessage(
          "Only the smart-contract owner can issue a warranty with your current Solidity contract."
        );
        return;
      }

      // -----------------------------------------------
      // INVOICE
      // The purchase date is read from the invoice and
      // the receipt number is derived from the file, so
      // neither has to be typed in.
      // -----------------------------------------------

      let invoiceHash = "";
      let thumbnail = "";
      let receiptNumber = "";
      let purchaseISO = "";

      try {
        setVerifyingInvoice(true);
        setMessage("Reading the invoice...");

        invoiceHash = await sha256File(invoiceFile);

        if (isInvoiceHashUsed(invoiceHash)) {
          setMessage(
            "This invoice was already used for another warranty."
          );
          return;
        }

        receiptNumber =
          receiptNumberFromHash(invoiceHash);

        if (
          warranties.some(
            (w) =>
              w.receiptNumber
                .trim()
                .toLowerCase() ===
              receiptNumber.toLowerCase()
          )
        ) {
          setMessage(
            "This invoice was already used for another warranty."
          );
          return;
        }

        const text = await readInvoiceText(invoiceFile);

        purchaseISO = extractPurchaseDate(text);

        if (!purchaseISO) {
          setMessage(
            "Could not find a purchase date on the invoice. Upload a clear, straight, well-lit photo of the invoice."
          );
          return;
        }

        thumbnail = await makeThumbnail(productImage);
      } catch (error) {
        console.error(error);
        setMessage(
          "Could not read the images. Upload clear JPG/PNG files."
        );
        return;
      } finally {
        setVerifyingInvoice(false);
      }

      try {
        setIssuing(true);

        const signer =
          await provider.getSigner();

        const writeContract =
          new Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer
          );

        const purchase =
          new Date(
            `${purchaseISO}T00:00:00`
          );

        const expiry =
          new Date(purchase);

        expiry.setMonth(
          expiry.getMonth() +
            Number(
              form.warrantyMonths || 0
            )
        );

        // -----------------------------------------------
        // IMPORTANT
        //
        // Serial number is NOT passed here.
        // Solidity generates:
        //
        // WC-1
        // WC-2
        // WC-3
        // ...
        // -----------------------------------------------

        const tx =
          await writeContract.registerWarranty(
            form.productName.trim(),
            receiptNumber,
            form.customerName.trim(),
            sellerName.trim() || shortAddress(account),
            form.customer,
            Math.floor(
              purchase.getTime() / 1000
            ),
            Math.floor(
              expiry.getTime() / 1000
            )
          );

        setMessage(
          "Transaction submitted. Waiting for blockchain confirmation..."
        );

        await tx.wait();

        // Invoice is verified and the chain accepted it:
        // keep the photo so cards show it instead of a letter.
        saveInvoice(receiptNumber, {
          hash: invoiceHash,
          thumbnail,
          fileName: invoiceFile.name,
        });

        setMessage(
          `Warranty registered on the blockchain (purchase date from invoice: ${purchaseISO}).`
        );

        setForm(EMPTY_FORM);
        setInvoiceFile(null);
        setProductImage(null);

        await loadWarranties();

        setActivePage(
          "My Warranties"
        );
      } catch (error) {
        console.error(error);

        setMessage(
          error?.reason ||
            error?.shortMessage ||
            "Warranty transaction failed."
        );
      } finally {
        setIssuing(false);
      }
    };

  // =====================================================
  // VERIFY PRODUCT
  // =====================================================

  const verifyProduct =
    async () => {
      const serial = normalizeSerial(search);

      if (!serial) {
        setMessage(
          "Enter a product ID (for example WC-1)."
        );

        setVerifiedWarranty(null);

        return;
      }

      try {
        setMessage("");
        setSearch(serial);

        const raw =
          await contract.getWarrantyBySerialNumber(
            serial
          );

        setVerifiedWarranty(
          toWarrantyObject(raw)
        );
      } catch (error) {
        console.error(error);
        setVerifiedWarranty(null);

        const text = String(
          error?.reason ||
            error?.shortMessage ||
            ""
        );

        setMessage(
          /not registered/i.test(text)
            ? `No product found with ID ${serial}. Check the ID and try again.`
            : "Could not read the blockchain. Make sure Ganache is running and MetaMask is on the right network."
        );
      }
    };

  // =====================================================
  // OPEN SELECTED RECORD
  // =====================================================

  if (selectedWarranty) {
    return (
      <div className="dashboard-shell">

        <Topbar
          account={account}
          onLogout={onLogout}
          onMenu={() =>
            setMobileMenu(
              !mobileMenu
            )
          }
        />

        <div className="dashboard-body">

          <Sidebar
            activePage=""
            go={go}
            mobileOpen={mobileMenu}
          />

          <main className="dashboard-content">

            <ReceiptDetail
              warranty={
                selectedWarranty
              }
              provider={provider}
              mode={selectedMode}
              onBack={() =>
                setSelectedWarranty(
                  null
                )
              }
            />

          </main>

        </div>

      </div>
    );
  }

  // =====================================================
  // MAIN DASHBOARD
  // =====================================================

  return (
    <div className="dashboard-shell">

      <Topbar
        account={account}
        onLogout={onLogout}
        onMenu={() =>
          setMobileMenu(
            !mobileMenu
          )
        }
      />

      <div className="dashboard-body">

        <Sidebar
          activePage={activePage}
          go={go}
          mobileOpen={mobileMenu}
        />

        <main className="dashboard-content">

          {/* ================= DASHBOARD ================= */}

          {activePage ===
            "Dashboard" && (
            <DashboardHome
              account={account}
              warranties={warranties}
              active={active}
              expired={expired}
              loading={loading}
              message={message}
              onView={(w) => {
                setSelectedWarranty(w);
                setSelectedMode(
                  "receipt"
                );
              }}
              onIssue={() =>
                go("Issue Warranty")
              }
              onVerify={() =>
                go("Verify Product")
              }
              onReceipts={() =>
                go("My Receipts")
              }
              onRefresh={
                loadWarranties
              }
            />
          )}

          {/* ================= MY RECEIPTS ================= */}

          {activePage ===
            "My Receipts" && (
            <ReceiptList
              title="Digital Receipts"
              subtitle="Your digital purchase records stored on-chain."
              warranties={filtered}
              search={search}
              setSearch={setSearch}
              loading={loading}
              mode="receipt"
              onView={(warranty) => {
                setSelectedWarranty(
                  warranty
                );

                setSelectedMode(
                  "receipt"
                );
              }}
            />
          )}

          {/* ================= MY WARRANTIES ================= */}

          {activePage ===
            "My Warranties" && (
            <ReceiptList
              title="Warranty Center"
              subtitle="Track every active and expired product warranty."
              warranties={filtered}
              search={search}
              setSearch={setSearch}
              loading={loading}
              mode="warranty"
              onView={(warranty) => {
                setSelectedWarranty(
                  warranty
                );

                setSelectedMode(
                  "warranty"
                );
              }}
            />
          )}

          {/* ================= ISSUE WARRANTY ================= */}

          {activePage ===
            "Issue Warranty" && (
            <IssueWarranty
              form={form}
              sellerName={sellerName}
              onChange={
                handleFormChange
              }
              onSubmit={
                issueWarranty
              }
              issuing={issuing}
              verifyingInvoice={verifyingInvoice}
              invoiceFile={invoiceFile}
              onInvoiceChange={setInvoiceFile}
              productImage={productImage}
              onProductImageChange={setProductImage}
              message={message}
              isOwner={
                ownerAddress &&
                ownerAddress.toLowerCase() ===
                  account.toLowerCase()
              }
            />
          )}

          {/* ================= VERIFY PRODUCT ================= */}

          {activePage ===
            "Verify Product" && (
            <VerifyProduct
              search={search}
              setSearch={setSearch}
              onVerify={
                verifyProduct
              }
              message={message}
              onView={(warranty) => {
                setSelectedWarranty(
                  warranty
                );

                setSelectedMode(
                  "warranty"
                );
              }}
              warranty={
                verifiedWarranty
              }
            />
          )}

          {/* ================= PROFILE ================= */}

          {activePage ===
            "Profile" && (
            <Profile
              account={account}
              ownerAddress={
                ownerAddress
              }
              warranties={
                warranties
              }
              profileName={
                profileNameInput
              }
              setProfileName={
                setProfileNameInput
              }
              sellerName={
                sellerName
              }
              onSave={
                saveSellerProfile
              }
              saving={
                savingProfile
              }
            />
          )}

        </main>

      </div>

    </div>
  );
}

// =====================================================
// TOPBAR
// =====================================================

function Topbar({
  account,
  onLogout,
  onMenu,
}) {
  const [dark, setDark] = useState(
    () => {
      try {
        return (
          localStorage.getItem(
            "wc-theme"
          ) === "dark"
        );
      } catch {
        return false;
      }
    }
  );

  const [menuOpen, setMenuOpen] =
    useState(false);

  useEffect(() => {
    document.body.classList.toggle(
      "wc-dark",
      dark
    );

    try {
      localStorage.setItem(
        "wc-theme",
        dark ? "dark" : "light"
      );
    } catch {
      // ignore storage errors
    }
  }, [dark]);

  return (
    <header className="dashboard-topbar">

      <button
        type="button"
        className="brand brand-home-btn"
        onClick={() => {
          window.location.href =
            "/";
        }}
      >
        <span className="brand-shield">
          ✓
        </span>

        <span>
          WarrantyChain
        </span>

      </button>

      <button
        className="mobile-menu-btn"
        onClick={onMenu}
      >
        ☰
      </button>

      <div className="topbar-right">

        <button
          className="icon-btn theme-btn"
          title={
            dark
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          onClick={() =>
            setDark(!dark)
          }
        >
          ♧
        </button>

        <div
          className={`avatar-wrap ${
            menuOpen ? "open" : ""
          }`}
          onMouseLeave={() =>
            setMenuOpen(false)
          }
        >
          <div
            className="avatar"
            onClick={() =>
              setMenuOpen(!menuOpen)
            }
          >
            {account
              .slice(2, 4)
              .toUpperCase()}
          </div>

          <div className="avatar-menu">
            <span title={account}>
              {shortAddress(account)}
            </span>

            <button
              type="button"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        </div>

      </div>

    </header>
  );
}

// =====================================================
// SIDEBAR
// =====================================================

function Sidebar({
  activePage,
  go,
  mobileOpen,
}) {
  const items = [
    { page: "Dashboard", label: "Dashboard", icon: "⌂" },
    { page: "My Receipts", label: "Receipts", icon: "▣" },
    { page: "My Warranties", label: "Warranties", icon: "♢" },
    { page: "Issue Warranty", label: "Issue Warranty", icon: "+" },
    { page: "Verify Product", label: "Verify Product", icon: "⌕" },
  ];

  return (
    <aside
      className={`sidebar ${
        mobileOpen
          ? "mobile-open"
          : ""
      }`}
    >

      <div className="side-nav">

        {items.map(
          ({ page, label, icon }) => (
            <button
              key={page}
              className={
                activePage === page
                  ? "side-link active"
                  : "side-link"
              }
              onClick={() =>
                go(page)
              }
            >
              <span>
                {icon}
              </span>

              {label}
            </button>
          )
        )}

      </div>

      <button
        className={
          activePage === "Profile"
            ? "side-link active"
            : "side-link"
        }
        onClick={() =>
          go("Profile")
        }
      >
        <span>
          ◉
        </span>

        Profile
      </button>

      <div className="side-wallet">

        <div className="metamask-icon">
          🦊
        </div>

        <div>

          <strong>
            MetaMask
          </strong>

          <span>
            Connected
          </span>

        </div>

      </div>

    </aside>
  );
}

// =====================================================
// DASHBOARD HOME
// =====================================================

function DashboardHome({
  account,
  warranties,
  active,
  expired,
  loading,
  message,
  onView,
  onIssue,
  onVerify,
  onReceipts,
  onRefresh,
}) {
  return (
    <>

      <div className="page-heading-row">

        <div>

          <h1>
          Warranty Status at a Glance 
          </h1>


        </div>

        <button
          className="refresh-btn"
          onClick={onRefresh}
        >
          ↻ Refresh
        </button>

      </div>

      {message && (
        <Notice
          text={message}
        />
      )}

      <div className="stat-grid">

        <StatCard
          icon="▣"
          label="Total Receipts"
          value={
            warranties.length
          }
          type="blue"
        />

        <StatCard
          icon="✓"
          label="Active Warranties"
          value={
            active.length
          }
          type="green"
        />

        <StatCard
          icon="!"
          label="Expired Warranties"
          value={
            expired.length
          }
          type="red"
        />

      </div>

      <div className="content-card recent-card">

        <div className="card-heading">

          <div>

            <h2>
              Recent Receipts
            </h2>

            <p>
              Latest records found on your blockchain account
            </p>

          </div>

          <button
            onClick={onIssue}
          >
            Issue New
          </button>

        </div>

        {loading ? (
          <Loading />
        ) : warranties.length ===
          0 ? (
          <Empty
            text="No warranties found for this wallet."
          />
        ) : (
          <div className="receipt-table-wrap">

            <table className="receipt-table">

              <thead>

                <tr>
                  <th>
                    Product
                  </th>

                  <th>
                    Receipt
                  </th>

                  <th>
                    Purchase Date
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Action
                  </th>
                </tr>

              </thead>

              <tbody>

                {warranties
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((w) => (
                    <tr
                      key={
                        w.warrantyId
                      }
                    >

                      <td>

                        <strong>
                          {
                            w.productName
                          }
                        </strong>

                        <small>
                          {
                            w.serialNumber
                          }
                        </small>

                      </td>

                      <td>
                        {
                          w.receiptNumber
                        }
                      </td>

                      <td>
                        {formatDate(
                          w.purchaseDate
                        )}
                      </td>

                      <td>

                        <Status
                          active={
                            w.expiry *
                              1000 >=
                            Date.now()
                          }
                        />

                      </td>

                      <td>

                        <button
                          className="table-view"
                          onClick={() =>
                            onView(w)
                          }
                        >
                          View
                        </button>

                      </td>

                    </tr>
                  ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      <div className="quick-grid">

        <button
          className="quick-card"
          onClick={onIssue}
        >
          <span className="quick-icon green">
            +
          </span>

          <div>

            <strong>
              Issue Warranty
            </strong>

            <small>
              Register a product
            </small>

          </div>

        </button>

        <button
          className="quick-card"
          onClick={onVerify}
        >
          <span className="quick-icon blue">
            ⌕
          </span>

          <div>

            <strong>
              Verify Product
            </strong>

            <small>
              Check authenticity
            </small>

          </div>

        </button>

        <button
          className="quick-card"
          onClick={onReceipts}
        >
          <span className="quick-icon purple">
            ▣
          </span>

          <div>

            <strong>
              Receipts
            </strong>

            <small>
              View digital records
            </small>

          </div>

        </button>

      </div>

    </>
  );
}

// =====================================================
// RECEIPT / WARRANTY LIST
// =====================================================

function ReceiptList({
  title,
  subtitle,
  warranties,
  search,
  setSearch,
  onView,
  loading,
  mode,
}) {
  return (
    <>

      <div className="page-heading-row">

        <div>

          <h1>
            {title}
          </h1>

          <p>
            {subtitle}
          </p>

        </div>

      </div>

      <div className="toolbar">

        <div className="search-box">

          ⌕

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search product, serial, receipt, customer or seller..."
          />

        </div>

      </div>

      {loading ? (
        <Loading />
      ) : warranties.length ===
        0 ? (
        <Empty
          text="No matching records found."
        />
      ) : (
        <div className="receipt-grid">

          {warranties.map((w) => (
            <ReceiptCard
              key={
                w.warrantyId
              }
              warranty={w}
              onOpen={onView}
              mode={mode}
            />
          ))}

        </div>
      )}

    </>
  );
}

// =====================================================
// ISSUE WARRANTY
// =====================================================

function IssueWarranty({
  form,
  sellerName,
  onChange,
  onSubmit,
  issuing,
  verifyingInvoice,
  invoiceFile,
  onInvoiceChange,
  productImage,
  onProductImageChange,
  message,
  isOwner,
}) {
  const previewUrl = useMemo(
    () =>
      productImage
        ? URL.createObjectURL(productImage)
        : "",
    [productImage]
  );

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  return (
    <>

      <div className="page-heading-row">

        <div>

          <h1>
            Register a Product
          </h1>

          <p>
            Register a new product warranty on your deployed blockchain.
          </p>

        </div>

      </div>

      {!isOwner && (
        <Notice
          text="Your current connected wallet is not the contract owner. Only the contract owner can issue warranties."
          error
        />
      )}

      {message && (
        <Notice
          text={message}
        />
      )}

      <form
        className="content-card warranty-form"
        onSubmit={onSubmit}
      >

        <div className="form-grid">

          <Field
            label="Product Name"
            name="productName"
            value={
              form.productName
            }
            onChange={
              onChange
            }
            placeholder="e.g. Laptop, Smartphone, etc."
            required
          />

          <Field
            label="Customer Name"
            name="customerName"
            value={
              form.customerName
            }
            onChange={
              onChange
            }
            placeholder="Enter customer name"
            required
          />

          <Field
            label="Customer Wallet Address"
            name="customer"
            value={
              form.customer
            }
            onChange={
              onChange
            }
            placeholder="0x..."
            required
          />

          <Field
            label="Warranty Period (months)"
            type="number"
            min="1"
            name="warrantyMonths"
            value={
              form.warrantyMonths
            }
            onChange={
              onChange
            }
            placeholder="12"
            required
          />

        </div>

        {/* =================================================
            PRODUCT PHOTO (shown instead of the first letter)
            ================================================= */}

        <label className="invoice-upload">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) =>
              onProductImageChange(
                e.target.files?.[0] || null
              )
            }
          />

          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Product preview"
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                objectFit: "cover",
                flex: "none",
              }}
            />
          ) : (
            <span className="invoice-upload-icon">
              ▣
            </span>
          )}

          <div>
            <strong>
              {productImage
                ? productImage.name
                : "Attach product photo"}
            </strong>
            <p>
              This photo is shown on the receipt and
              warranty cards instead of the first
              letter of the product name.
            </p>
          </div>
        </label>

        {/* =================================================
            PURCHASE INVOICE (required)
            ================================================= */}

        <label className="invoice-upload">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) =>
              onInvoiceChange(
                e.target.files?.[0] || null
              )
            }
          />

          <span className="invoice-upload-icon">
            ⬆
          </span>

          <div>
            <strong>
              {invoiceFile
                ? invoiceFile.name
                : "Attach purchase invoice"}
            </strong>
            <p>
              Upload the invoice (JPG / PNG). The
              purchase date is read from the invoice
              automatically, so you do not need to
              type it.
            </p>
          </div>
        </label>

        <button
          className="blue-btn full-btn"
          disabled={
            issuing ||
            verifyingInvoice ||
            !isOwner
          }
        >
          {verifyingInvoice
            ? "Verifying invoice..."
            : issuing
            ? "Confirming on Blockchain..."
            : "Issue Warranty"}
        </button>

      </form>

    </>
  );
}

// =====================================================
// VERIFY PRODUCT
// =====================================================

function VerifyProduct({
  search,
  setSearch,
  onVerify,
  message,
  warranty,
  onView,
}) {
  const verifyUrl = search.trim()
    ? verifyUrlFor(search.trim())
    : PUBLIC_URL;

  const active =
    warranty &&
    warranty.expiry * 1000 >=
      Date.now();

  const days =
    warranty && active
      ? Math.max(
          0,
          Math.ceil(
            (warranty.expiry * 1000 -
              Date.now()) /
              86400000
          )
        )
      : 0;

  return (
    <>
      <div className="verify-page">

        <div className="verify-heading">

          <span className="section-label">
            PRODUCT AUTHENTICATION
          </span>

          <h1>
            Product Verification
          </h1>

          <p>
            Enter the product serial number to verify its authenticity and warranty status.
          </p>

        </div>

        <div className="verify-box">

          <div className="qr-placeholder">

            <QRCodeCanvas
              value={
                verifyUrl
              }
              size={145}
              bgColor="#ffffff"
              fgColor="#12245b"
              level="H"
              includeMargin={
                true
              }
            />

            <span>
              QR verification
            </span>

          </div>

          <div className="verify-form">

            <label>
              Product ID / Serial Number
            </label>

            <div className="verify-input">

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="e.g. WC-1"
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    onVerify();
                  }
                }}
              />

              <button
                onClick={
                  onVerify
                }
              >
                Verify
              </button>

            </div>

          </div>

        </div>

        {message && (
          <Notice
            text={message}
            error
          />
        )}

        {warranty && (
          <div className="verify-result">

            <div className="verify-result-header">

              <div>

                <span className="section-label">
                  BLOCKCHAIN VERIFIED
                </span>

                <h2>
                  {
                    warranty.productName
                  }
                </h2>

                <p>
                  Product record found on the blockchain.
                </p>

              </div>

              <div
                className={`verify-status ${
                  active
                    ? "active"
                    : "expired"
                }`}
              >
                <span>
                  ●
                </span>

                {active
                  ? "Active"
                  : "Expired"}

              </div>

            </div>

            <div className="verify-main-grid">

              <div className="verify-details-card">

                <div className="verify-card-title">

                  <h3>
                    Warranty Details
                  </h3>

                  <span className="detail-status">
                    {active
                      ? "Active Warranty"
                      : "Expired Warranty"}
                  </span>

                </div>

                <div className="verify-details-list">

                  <div className="verify-detail-row">

                    <span>
                      Product ID / Serial Number
                    </span>

                    <strong>
                      {
                        warranty.serialNumber
                      }
                    </strong>

                  </div>

                  <div className="verify-detail-row">

                    <span>
                      Receipt Number
                    </span>

                    <strong>
                      {
                        warranty.receiptNumber
                      }
                    </strong>

                  </div>

                  <div className="verify-detail-row">

                    <span>
                      Customer Name
                    </span>

                    <strong>
                      {
                        warranty.customerName ||
                        "—"
                      }
                    </strong>

                  </div>

                  <div className="verify-detail-row">

                    <span>
                      Seller Name
                    </span>

                    <strong>
                      {
                        warranty.sellerName ||
                        "—"
                      }
                    </strong>

                  </div>

                  <div className="verify-detail-row">

                    <span>
                      Purchase Date
                    </span>

                    <strong>
                      {formatDate(
                        warranty.purchaseDate
                      )}
                    </strong>

                  </div>

                  <div className="verify-detail-row">

                    <span>
                      Warranty Expiry
                    </span>

                    <strong>
                      {formatDate(
                        warranty.expiry
                      )}
                    </strong>

                  </div>

                  <div className="verify-detail-row">

                    <span>
                      Remaining
                    </span>

                    <strong className="remaining-value">
                      {days} days
                    </strong>

                  </div>

                  <div className="verify-detail-row">

                    <span>
                      Status
                    </span>

                    <strong
                      className={
                        active
                          ? "active-text"
                          : "expired-text"
                      }
                    >
                      {active
                        ? "Active"
                        : "Expired"}
                    </strong>

                  </div>

                </div>

              </div>

              <div className="verify-timeline-card">

                <div className="verify-card-title">

                  <h3>
                    Warranty Timeline
                  </h3>

                </div>

                <div className="warranty-timeline">

                  <div className="timeline-item completed">

                    <div className="timeline-dot">
                      ✓
                    </div>

                    <div className="timeline-content">

                      <strong>
                        Warranty Issued
                      </strong>

                      <small>
                        {formatDate(
                          warranty.purchaseDate
                        )}
                      </small>

                    </div>

                  </div>

                  <div className="timeline-item completed">

                    <div className="timeline-dot">
                      ✓
                    </div>

                    <div className="timeline-content">

                      <strong>
                        Product Verified
                      </strong>

                      <small>
                        Record found on blockchain
                      </small>

                    </div>

                  </div>

                  <div
                    className={`timeline-item ${
                      active
                        ? "current"
                        : "completed"
                    }`}
                  >

                    <div className="timeline-dot">
                      {active
                        ? "●"
                        : "✓"}
                    </div>

                    <div className="timeline-content">

                      <strong>
                        {active
                          ? "Warranty Remaining"
                          : "Warranty Period"}
                      </strong>

                      <small>
                        {active
                          ? `Valid until ${formatDate(
                              warranty.expiry
                            )}`
                          : `Warranty was valid until ${formatDate(
                              warranty.expiry
                            )}`}
                      </small>

                    </div>

                  </div>

                  <div
                    className={`timeline-item ${
                      active
                        ? "upcoming"
                        : "expired"
                    }`}
                  >

                    <div className="timeline-dot">
                      {active
                        ? "○"
                        : "!"}
                    </div>

                    <div className="timeline-content">

                      <strong>
                        Warranty Expiry
                      </strong>

                      <small>
                        {formatDate(
                          warranty.expiry
                        )}
                      </small>

                    </div>

                  </div>

                </div>

              </div>

            </div>

            <div className="verify-blockchain-proof">

              <div>

                <span className="section-label">
                  BLOCKCHAIN PROOF
                </span>

                <h2>
                  Verified on WarrantySystem
                </h2>

                <p>
                  Warranty #
                  {
                    warranty.warrantyId
                  }{" "}
                  is stored on the deployed WarrantySystem contract.
                </p>

              </div>

              <div className="verification-success">
                ✓ Product record confirmed on blockchain
              </div>

            </div>

            <button
              className="verify-chain-btn"
              onClick={() =>
                onView(warranty)
              }
            >
              View Full Warranty Details
            </button>

          </div>
        )}

        <div className="verify-features">

          <div>

            <span>
              ♢
            </span>

            <strong>
              Authentic receipt
            </strong>

            <small>
              Verified on blockchain
            </small>

          </div>

          <div>

            <span>
              ◷
            </span>

            <strong>
              Warranty Status
            </strong>

            <small>
              Real-time validity
            </small>

          </div>

          <div>

            <span>
              ✓
            </span>

            <strong>
              Secure & Transparent
            </strong>

            <small>
              No manual changes
            </small>

          </div>

        </div>

      </div>
    </>
  );
}

// =====================================================
// PROFILE
// =====================================================

function Profile({
  account,
  ownerAddress,
  warranties,
  profileName,
  setProfileName,
  sellerName,
  onSave,
  saving,
}) {
  const [editingName, setEditingName] = useState(false);

  const isOwner =
    ownerAddress &&
    ownerAddress.toLowerCase() ===
      account.toLowerCase();

  return (
    <>
      <div className="profile-card content-card">

        <div className="profile-top">

          <div className="large-avatar">
            {(
              profileName ||
              account.slice(2, 3)
            )
              .slice(0, 1)
              .toUpperCase()}
          </div>

          <div>

            <h2>
              {profileName ||
                "Seller Profile"}
            </h2>

          </div>

          <span className="connected-pill">
            ● Connected
          </span>

        </div>

        {/* =================================================
            SELLER NAME
            ================================================= */}

        <div
          className="profile-field"
          style={{
            display: "block",
          }}
        >

          <span
            style={{
              display: "block",
              marginBottom: "8px",
            }}
          >
            Seller Name
          </span>

          {sellerName && !editingName ? (
            <div className="profile-name-display">
              <strong>{sellerName}</strong>
              <button
                type="button"
                className="profile-edit-button"
                onClick={() => setEditingName(true)}
                aria-label="Edit seller name"
                title="Edit seller name"
              >
                ✎
              </button>
            </div>
          ) : (
            <>
              <input
                value={profileName}
                onChange={(e) =>
                  setProfileName(e.target.value)
                }
                placeholder="Enter your name"
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d9deea",
                  fontSize: "15px",
                  boxSizing: "border-box",
                }}
              />

              <small
                style={{
                  display: "block",
                  marginTop: "8px",
                }}
              >
                This name will automatically appear as the seller name whenever you issue a new warranty.
              </small>

              <button
                type="button"
                className="blue-btn"
                onClick={async () => {
                  if (await onSave()) {
                    setEditingName(false);
                  }
                }}
                disabled={
                  saving ||
                  !profileName.trim()
                }
                style={{
                  marginTop: "14px",
                }}
              >
                {saving ? "Saving..." : "Save Profile Name"}
              </button>

              {sellerName && (
                <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={() => {
                    setProfileName(sellerName);
                    setEditingName(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}
            </>
          )}

        </div>

        {/* =================================================
            PROFILE STATS
            ================================================= */}

        <div className="profile-stats">

          <div>

            <strong>
              {
                warranties.length
              }
            </strong>

            <span>
              Total Records
            </span>

          </div>

          <div>

            <strong>
              {isOwner
                ? "Owner"
                : "Customer"}
            </strong>

            <span>
              Blockchain Role
            </span>

          </div>

        </div>

      </div>
    </>
  );
}

// =====================================================
// REUSABLE COMPONENTS
// =====================================================

function Field({
  label,
  ...props
}) {
  return (
    <label className="field">

      <span>
        {label}
      </span>

      <input
        {...props}
      />

    </label>
  );
}

function StatCard({
  icon,
  label,
  value,
  type,
}) {
  return (
    <div className="stat-card">

      <div
        className={`stat-icon ${type}`}
      >
        {icon}
      </div>

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}

function Status({
  active,
}) {
  return (
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
  );
}

function Notice({
  text,
  error = false,
}) {
  return (
    <div
      className={`notice ${
        error ? "error" : ""
      }`}
    >

      {error
        ? "!"
        : "✓"}

      <span>
        {text}
      </span>

    </div>
  );
}

function Loading() {
  return (
    <div className="loading-box">
      Loading blockchain records...
    </div>
  );
}

function Empty({
  text,
}) {
  return (
    <div className="empty-box">

      <div>
        ▣
      </div>

      <strong>
        {text}
      </strong>

      <span>
        Records will appear here after they are registered.
      </span>

    </div>
  );
}