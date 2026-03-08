import React, { useState } from "react";
import { NATIVE_BTC } from "../lib/constants";

interface Props {
  onDeposit: (seller: string, token: string, amount: bigint) => Promise<string | undefined>;
  loading:   boolean;
}

export const CreateEscrow: React.FC<Props> = ({ onDeposit, loading }) => {
  const [seller,    setSeller]    = useState("");
  const [token,     setToken]     = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [useNative, setUseNative] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountStr);
    if (!seller || isNaN(amt) || amt <= 0) return;

    // Convert BTC to sats if native, else assume wei-like units for OP_20
    const amountBig = useNative
      ? BigInt(Math.round(amt * 1e8))  // BTC → satoshis
      : BigInt(Math.round(amt * 1e8)); // OP_20: adjust decimals as needed

    const tok = useNative ? NATIVE_BTC : token;
    await onDeposit(seller, tok, amountBig);
  };

  return (
    <form className="card create-form" onSubmit={handleSubmit}>
      <h2 className="card-title">New Escrow</h2>

      <label className="field">
        <span>Seller Address</span>
        <input
          className="input"
          placeholder="bc1p…"
          value={seller}
          onChange={e => setSeller(e.target.value)}
          required
        />
      </label>

      <label className="field toggle-row">
        <span>Asset</span>
        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-btn ${useNative ? "active" : ""}`}
            onClick={() => setUseNative(true)}
          >BTC</button>
          <button
            type="button"
            className={`toggle-btn ${!useNative ? "active" : ""}`}
            onClick={() => setUseNative(false)}
          >OP_20</button>
        </div>
      </label>

      {!useNative && (
        <label className="field">
          <span>Token Address</span>
          <input
            className="input"
            placeholder="bc1p… (OP_20 contract)"
            value={token}
            onChange={e => setToken(e.target.value)}
            required={!useNative}
          />
        </label>
      )}

      <label className="field">
        <span>Amount {useNative ? "(BTC)" : "(tokens)"}</span>
        <input
          className="input"
          type="number"
          placeholder="0.001"
          min="0"
          step="any"
          value={amountStr}
          onChange={e => setAmountStr(e.target.value)}
          required
        />
      </label>

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? <span className="spinner" /> : "🔒 Lock Funds"}
      </button>
    </form>
  );
};