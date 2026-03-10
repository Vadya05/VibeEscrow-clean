import { CONTRACT_ADDRESS, NETWORK } from "./constants";

const RPC_URL =
  NETWORK === "mainnet"
    ? "https://api.opnet.org"
    : "https://testnet.opnet.org";

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(`${RPC_URL}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export interface EscrowRecord {
  id:             bigint;
  buyer:          string;
  seller:         string;
  token:          string;
  amount:         bigint;
  deadline:       bigint;
  status:         number;
  buyerApproved:  boolean;
  sellerApproved: boolean;
}

export async function fetchEscrow(id: bigint): Promise<EscrowRecord | null> {
  try {
    const result = await rpcCall("contract_call", [
      { address: CONTRACT_ADDRESS, method: "get_escrow", args: [id.toString()] },
    ]) as { decoded?: unknown[] } | null;
    if (!result?.decoded) return null;
    const d = result.decoded;
    return {
      id,
      buyer:          d[0] as string,
      seller:         d[1] as string,
      token:          d[2] as string,
      amount:         BigInt(d[3] as string),
      deadline:       BigInt(d[4] as string),
      status:         Number(d[5]),
      buyerApproved:  Boolean(d[6]),
      sellerApproved: Boolean(d[7]),
    };
  } catch {
    return null;
  }
}

export async function fetchEscrowCount(): Promise<bigint> {
  try {
    const result = await rpcCall("contract_call", [
      { address: CONTRACT_ADDRESS, method: "get_escrow_count", args: [] },
    ]) as { decoded?: unknown[] } | null;
    return BigInt((result?.decoded?.[0] as string) ?? "0");
  } catch {
    return 0n;
  }
}

export async function fetchTimeLeft(id: bigint): Promise<number> {
  try {
    const result = await rpcCall("contract_call", [
      { address: CONTRACT_ADDRESS, method: "get_time_left", args: [id.toString()] },
    ]) as { decoded?: unknown[] } | null;
    return Number((result?.decoded?.[0] as string) ?? "0");
  } catch {
    return 0;
  }
}

declare global {
  interface Window {
    opnet?: {
      requestAccounts: () => Promise<string[]>;
      getPublicKey:    () => Promise<string>;
      getBalance:      () => Promise<{ confirmed: bigint; unconfirmed: bigint }>;
      signAndBroadcastInteraction: (params: {
        contractAddress: string;
        method:  string;
        args:    unknown[];
        value?:  bigint;
      }) => Promise<{ txId: string }>;
    };
  }
}

export async function connectWallet(): Promise<{ address: string; publicKey: string }> {
  if (!window.opnet) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!window.opnet) throw new Error("OP_WALLET not found. Install from opnet.org");
  const accounts = await window.opnet.requestAccounts();
  const address = accounts[0];
  const publicKey = await window.opnet.getPublicKey();
  return { address, publicKey };
}

export function isWalletAvailable(): boolean {
  return typeof window !== "undefined" && !!window.opnet;
}

export async function getWalletBalance() {
  if (!window.opnet) throw new Error("OP_WALLET not found");
  return window.opnet.getBalance();
}

export async function txDeposit(
  seller: string,
  token:  string,
  amount: bigint,
  isNative: boolean
) {
  if (!window.opnet) throw new Error("OP_WALLET not found");
  return window.opnet.signAndBroadcastInteraction({
    contractAddress: CONTRACT_ADDRESS,
    method:  "deposit",
    args:    [seller, token, amount],
    value:   isNative ? amount : 0n,
  });
}

export async function txApprove(id: bigint) {
  if (!window.opnet) throw new Error("OP_WALLET not found");
  return window.opnet.signAndBroadcastInteraction({
    contractAddress: CONTRACT_ADDRESS,
    method:  "approve",
    args:    [id],
  });
}

export async function txRefund(id: bigint) {
  if (!window.opnet) throw new Error("OP_WALLET not found");
  return window.opnet.signAndBroadcastInteraction({
    contractAddress: CONTRACT_ADDRESS,
    method:  "refund",
    args:    [id],
  });
}
