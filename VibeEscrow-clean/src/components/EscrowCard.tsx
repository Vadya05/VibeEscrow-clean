import React from "react";
import { EscrowRecord } from "../lib/opnet";
import { StatusBadge } from "./StatusBadge";
import { EscrowTimer } from "./EscrowTimer";
import { NATIVE_BTC } from "../lib/constants";

interface Props {
  escrow:    EscrowRecord;
  timeLeft:  number;
  myAddress: string;
  onApprove: (id: bigint) => void;
  onRefund:  (id: bigint) => void;
  loading:   boolean;
}

function satsToBTC(sats: bigint): string {
  return (Number(sats) / 1e8).toFixed(8);
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-6)}` : addr;
}

export const EscrowCard: React.FC<Props> = ({
  escrow, timeLeft, myAddress, onApprove, onRefund, loading
}) => {
  const isBuyer   = myAddress.toLowerCase() === escrow.buyer.toLowerCase();
  const isSeller  = myAddress.toLowerCase() === escrow.seller.toLowerCase();
  const isPending = escrow.status === 0;
  const isNative  = escrow.token === NATIVE_BTC;

  const alreadyApproved = (isBuyer && escrow.buyerApproved) || (isSeller && escrow.sellerApproved);
  const canApprove = isPending && (isBuyer || isSeller) && !alreadyApproved;
  const canRefund  = isPending && timeLeft <= 0 && (isBuyer || isSeller);

  return (
    <div className={`card escrow-card status-${escrow.status}`}>
      <div className="escrow-header">
        <span className="escrow-id">#{escrow.id.toString()}</span>
        <StatusBadge status={escrow.status} />
      </div>

      <div className="escrow-amount">
        <span className="amount-big">
          {satsToBTC(escrow.amount)}
        </span>
        <span className="amount-unit">
          {isNative ? "BTC" : `OP_20 (${shortAddr(escrow.token)})`}
        </span>
      </div>

      <div className="escrow-parties">
        <div className="party">
          <span className="party-label">Buyer</span>
          <span className={`party-addr ${isBuyer ? "party-me" : ""}`}>
            {shortAddr(escrow.buyer)}
            {escrow.buyerApproved && " ✓"}
          </span>
        </div>
        <div className="party-arrow">→</div>
        <div className="party">
          <span className="party-label">Seller</span>
          <span className={`party-addr ${isSeller ? "party-me" : ""}`}>
            {shortAddr(escrow.seller)}
            {escrow.sellerApproved && " ✓"}
          </span>
        </div>
      </div>

      {isPending && <EscrowTimer seconds={timeLeft} />}

      <div className="escrow-actions">
        {canApprove && (
          <button
            className="btn btn-success"
            onClick={() => onApprove(escrow.id)}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : "✅ Release"}
          </button>
        )}
        {canRefund && (
          <button
            className="btn btn-danger"
            onClick={() => onRefund(escrow.id)}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : "↩ Refund"}
          </button>
        )}
        {!canApprove && !canRefund && isPending && (
          <p className="waiting-text">
            {alreadyApproved ? "Waiting for other party…" : "Not your escrow"}
          </p>
        )}
      </div>
    </div>
  );
};