import { useState } from "react";

function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletConnect({ account, onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="wallet-menu-wrap">
      <button
        className="wallet-chip"
        onClick={() => setOpen(!open)}
      >
        <span className="wallet-dot" />
        {shortAddress(account)}
        <span>⌄</span>
      </button>

      {open && (
        <div className="wallet-dropdown">
          <span>{account}</span>

          <button onClick={onLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}