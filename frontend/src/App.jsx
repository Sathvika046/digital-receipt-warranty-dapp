import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import "./App.css";
import Dashboard from "./components/Dashboard";
import PublicVerify from "./components/PublicVerify";
import Navbar from "./components/landing/Navbar";
import AboutSection from "./components/landing/AboutSection";
import ContactSection from "./components/landing/ContactSection";
import FaqSection from "./components/landing/FaqSection";
import Footer from "./components/landing/Footer";

export const CONTRACT_ADDRESS =
  "0xeE8a7A2BbCD1f6E74c560089F8Ec11E388fe19dE"

// RPC used by the public QR page (no wallet). Defaults to the machine that
// served the website, port 7546, so it also works from a phone on your Wi-Fi.
export const RPC_URL =
  import.meta.env.VITE_RPC_URL || `http://${window.location.hostname}:7546`;

// Base URL written inside QR codes. For phones, open the site through your
// PC's Wi-Fi IP (e.g. http://192.168.1.5:5173) or set VITE_PUBLIC_URL in .env
export const PUBLIC_URL = (
  import.meta.env.VITE_PUBLIC_URL || window.location.origin
).replace(/\/$/, "");

export const verifyUrlFor = (serial) =>
  `${PUBLIC_URL}/verify/${encodeURIComponent(serial)}`;

export const EXPECTED_CHAIN_ID = 5778n;

export const CONTRACT_ABI = [
  "function owner() view returns (address)",

  "function registerWarranty(string,string,string,string,address,uint256,uint256) returns (uint256)",

  "function getWarranty(uint256) view returns (uint256,string,string,string,string,string,address,address,uint256,uint256,bool)",

  "function getWarrantyBySerialNumber(string) view returns (uint256,string,string,string,string,string,address,address,uint256,uint256,bool)",

  "function isWarrantyValid(uint256) view returns (bool)",

  "function getRemainingWarrantyDays(uint256) view returns (uint256)",

  "function warrantyExists(uint256) view returns (bool)",

  "function nextWarrantyId() view returns (uint256)",
];

export function shortAddress(address) {
  if (!address) return "";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return "—";

  return new Date(Number(timestamp) * 1000).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export function toWarrantyObject(raw) {
  return {
    warrantyId: Number(raw[0]),
    productName: raw[1],
    serialNumber: raw[2],
    receiptNumber: raw[3],

    customerName: raw[4],
    sellerName: raw[5],

    customer: raw[6],
    seller: raw[7],

    purchaseDate: Number(raw[8]),
    expiry: Number(raw[9]),
    exists: raw[10],
  };
}

const SECTION_IDS = ["home", "about", "contact", "faq"];

function MainApp() {
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [page, setPage] = useState("home");

  // Highlight the nav link of the section currently on screen.
  useEffect(() => {
    const onScroll = () => {
      if (!document.getElementById("home")) return;

      let current = "home";
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) current = id;
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) current = "faq";

      setPage(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus("MetaMask is not installed.");
      return;
    }

    setConnecting(true);
    setStatus("");

    try {
      const browserProvider =
        new BrowserProvider(window.ethereum);

      const accounts =
        await browserProvider.send(
          "eth_requestAccounts",
          []
        );

      const network =
        await browserProvider.getNetwork();

      if (
        network.chainId !==
        EXPECTED_CHAIN_ID
      ) {
        setStatus(
          "Please switch MetaMask to your Ganache network (Chain ID 5778)."
        );

        setConnecting(false);
        return;
      }

      setProvider(browserProvider);
      setAccount(accounts[0]);
    } catch (error) {
      console.error(error);

      setStatus(
        error?.shortMessage ||
          "Wallet connection failed."
      );
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const onAccountsChanged = (
      accounts
    ) => {
      if (!accounts.length) {
        setAccount("");
        setProvider(null);
      } else {
        setAccount(accounts[0]);
      }
    };

    const onChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on(
      "accountsChanged",
      onAccountsChanged
    );

    window.ethereum.on(
      "chainChanged",
      onChainChanged
    );

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        onAccountsChanged
      );

      window.ethereum.removeListener(
        "chainChanged",
        onChainChanged
      );
    };
  }, []);

  const logout = () => {
    setAccount("");
    setProvider(null);
    setStatus("");
  };

  if (account && provider) {
    return (
      <Dashboard
        account={account}
        provider={provider}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="landing-page">

      <Navbar
        page={page}
        onConnect={connectWallet}
        connecting={connecting}
      />

      {status && (
        <div className="landing-status nav-status" role="alert">
          {status}
        </div>
      )}

      <main>

        <div id="home" className="landing-anchor">
        <section
          className="hero-section"
        >

          <div className="hero-copy">

            <div className="hero-eyebrow">
              BLOCKCHAIN-BASED DIGITAL WARRANTY
            </div>

            <h1>
              Your Product.
              <br />
              Verified Forever.
            </h1>

            <p>
              A blockchain-powered platform
              to issue, track and verify
              digital receipts and product
              warranties with a secure wallet
              connection.
            </p>

            <div className="hero-buttons">

              <button
                className="blue-btn"
                onClick={connectWallet}
                disabled={connecting}
              >
                {connecting
                  ? "Connecting..."
                  : "Get Started"}
              </button>

              <a
                className="outline-btn"
                href="#about"
              >
                Learn More
              </a>

            </div>

          </div>

          <div className="hero-visual">

            <div className="floating-card receipt-float">

              <div className="mini-card-title">
                DIGITAL RECEIPT
              </div>

              <div className="mini-line wide" />
              <div className="mini-line" />
              <div className="mini-line" />

              <span className="verified-badge">
                ✓ Verified
              </span>

            </div>

            <div className="hero-shield">
              ✓
            </div>

            <div className="block block-1">
              ◇
            </div>

            <div className="block block-2">
              ◇
            </div>

            <div className="block block-3">
              ◇
            </div>

            <div className="laptop-shape">
              <div className="laptop-screen" />
              <div className="laptop-base" />
            </div>

          </div>

        </section>

        <section
          className="feature-strip"
        >

          <Feature
            icon="⛓"
            title="Blockchain Powered"
            text="Tamper-proof & transparent"
          />

          <Feature
            icon="▣"
            title="Instant Verification"
            text="Scan QR & verify"
          />

          <Feature
            icon="◷"
            title="Track Warranty"
            text="Real-time status"
          />

          <Feature
            icon="♙"
            title="Secure Wallet"
            text="MetaMask integration"
          />

        </section>
        </div>

        <div id="about" className="landing-anchor">
          <AboutSection />
        </div>

        <div id="contact" className="landing-anchor">
          <ContactSection />
        </div>

        <div id="faq" className="landing-anchor">
          <FaqSection />
        </div>

      </main>

      <Footer />

    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}) {
  return (
    <div className="feature-item">

      <div className="feature-icon">
        {icon}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>

      </div>

    </div>
  );
}

function App() {
  // A QR scan opens /verify/<serial>: show only the public, read-only details.
  if (window.location.pathname.startsWith("/verify")) return <PublicVerify />;
  return <MainApp />;
}

export default App;