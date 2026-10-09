
export default function Footer() {
  return (
    <footer className="lp-footer">
      <a className="brand" href="#home">
        <span className="brand-shield">✓</span>
        <span>WarrantyChain</span>
      </a>

      <small>
        © {new Date().getFullYear()} WarrantyChain. Warranty records secured on
        the blockchain.
      </small>
    </footer>
  );
}