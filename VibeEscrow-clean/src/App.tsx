import React, { useState, useCallback } from "react";
import { WalletConnect } from "./components/WalletConnect";
import { CreateEscrow }  from "./components/CreateEscrow";
import { EscrowCard }    from "./components/EscrowCard";
import { useWallet }     from "./hooks/useWallet";
import { useEscrow }     from "./hooks/useEscrow";
import { CONTRACT_ADDRESS, NETWORK } from "./lib/constants";

export default function App() {
  const wallet = useWallet();
  const esc    = useEscrow();

  const [lookupId,  setLookupId]  = useState("");
  const [createTab, setCreateTab] = useState(false);
  const [successTx, setSuccessTx] = useState<string | null>(null);

  const handleDeposit = useCallback(async (seller: string, token: string, amount: bigint) => {
    const txId = await esc.deposit(seller, token, amount);
    if (txId) {
      setSuccessTx(txId);
      setCreateTab(false);
    }
    return txId;
  }, [esc]);

  const handleLookup = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (lookupId === "") return;
    esc.load(BigInt(lookupId));
  }, [lookupId, esc]);

  const handleApprove = useCallback(async (id: bigint) => {
    await esc.approve(id);
    esc.load(id);
    wallet.refreshBalance();
  }, [esc, wallet]);

  const handleRefund = useCallback(async (id: bigint) => {
    await esc.refund(id);
    esc.load(id);
    wallet.refreshBalance();
  }, [esc, wallet]);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-brand">
          <span className="logo">🔐</span>
          <div>
            <h1 className="brand-name">VibeEscrow</h1>
            <p className="brand-sub">Bitcoin L1 · Trustless · P2P</p>
          </div>
        </div>
        <div className="header-right">
          <span className={`network-badge net-${NETWORK}`}>{NETWORK}</span>
          <WalletConnect wallet={wallet} />
        </div>
      </header>

      <main className="main">
        {/* ── Contract info strip ── */}
        <div className="contract-strip">
          <span className="strip-label">Contract</span>
          <span className="strip-addr">{CONTRACT_ADDRESS}</span>
        </div>

        {/* ── Wallet error ── */}
        {wallet.error && (
          <div className="alert alert-error">
            ⚠️ {wallet.error}
            <a href="https://opnet.org" target="_blank" rel="noreferrer" className="alert-link">
              Install OP_WALLET →
            </a>
          </div>
        )}

        {/* ── Success TX ── */}
        {successTx && (
          <div className="alert alert-success">
            ✅ Transaction sent!{" "}
            <a
              href={`https://explorer.opnet.org/tx/${successTx}`}
              target="_blank" rel="noreferrer"
              className="alert-link"
            >
              {successTx.slice(0, 16)}… View →
            </a>
            <button className="alert-close" onClick={() => setSuccessTx(null)}>×</button>
          </div>
        )}

        {/* ── Tabs ── */}
        {wallet.connected && (
          <div className="tabs">
            <button
              className={`tab ${!createTab ? "tab-active" : ""}`}
              onClick={() => setCreateTab(false)}
            >Look Up Escrow</button>
            <button
              className={`tab ${createTab ? "tab-active" : ""}`}
              onClick={() => setCreateTab(true)}
            >+ New Escrow</button>
          </div>
        )}

        {/* ── Create ── */}
        {wallet.connected && createTab && (
          <CreateEscrow onDeposit={handleDeposit} loading={esc.loading} />
        )}

        {/* ── Lookup ── */}
        {wallet.connected && !createTab && (
          <form className="lookup-form" onSubmit={handleLookup}>
            <input
              className="input"
              type="number"
              placeholder="Enter escrow ID (e.g. 0)"
              value={lookupId}
              onChange={e => setLookupId(e.target.value)}
              min="0"
            />
            <button className="btn btn-primary" type="submit" disabled={esc.loading}>
              {esc.loading ? <span className="spinner" /> : "🔍 Load"}
            </button>
          </form>
        )}

        {/* ── Escrow card ── */}
        {esc.escrow && wallet.address && (
          <EscrowCard
            escrow={esc.escrow}
            timeLeft={esc.timeLeft}
            myAddress={wallet.address}
            onApprove={handleApprove}
            onRefund={handleRefund}
            loading={esc.loading}
          />
        )}

        {/* ── Error ── */}
        {esc.error && (
          <div className="alert alert-error">⚠️ {esc.error}</div>
        )}

        {/* ── Onboarding ── */}
        {!wallet.connected && (
          <div className="onboarding">
            <div className="onboard-icon">🔐</div>
            <h2>Trustless Bitcoin Escrow</h2>
            <p>Lock BTC or OP_20 tokens between buyer & seller.<br />
               Funds release only when <strong>both parties approve</strong>.<br />
               Auto-refund after 7 days if no deal.</p>
            <div className="onboard-steps">
              <div className="step"><span>1</span>Connect OP_WALLET</div>
              <div className="step"><span>2</span>Create or look up escrow</div>
              <div className="step"><span>3</span>Approve or wait for refund</div>
            </div>
            <WalletConnect wallet={wallet} />
          </div>
        )}
      </main>

      <footer className="footer">
        <span>VibeEscrow · Open Source · Bitcoin L1</span>
        <a href="https://github.com/YOUR_USERNAME/vibeescrow" target="_blank" rel="noreferrer">
          GitHub →
        </a>
      </footer>
    </div>
  );
}