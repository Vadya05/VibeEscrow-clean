import { CONTRACT_ADDRESS } from "./constants";

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

declare global {
  interface Window {
    opnet?: {
      connect: () => Promise<{ address: string; publicKey: string }>;
      getBalance: () => Promise<{ confirmed: bigint; unconfirmed: bigint }>;
      callReadOnly: (params: {
        contractAddress: string;
        method: string;
        args: unknown[];
      }) => Promise<{ status: string; decoded: unknown[] } | null>;
      signAndBroadcast: (params: {
        contractAddress: string;
        method: string;
        args: unknown[];
        value?: bigint;
      }) => Promise<{ txId: string }>;
    };
  }
}

export function isWalletAvailable(): boolean {
  return typeof window !== "undefined" && !!window.opnet;
}

export async function connectWallet(): Promise<{ address: string; publicKey: string }> {
  if (!window.opnet) throw new Error("OP_WALLET not found");
  return window.opnet.connect();
}

export async function getWalletBalance() {
  if (!window.opnet) throw new Error("OP_WALLET not found");
  return window.opnet.getBalance();
}

export async function fetchEscrow(id: bigint): Promise<EscrowRecord | null> {
  if (!window.opnet) return null;
  try {
    const result = await window.opnet.callReadOnly({
      contractAddress: CONTRACT_ADDRESS,
      method: "get_escrow",
      args: [id],
    });
    if (!result || result.status === "None") return null;
    const d = result.decoded;
    return {
      id,
      buyer: d[0] as string,
      seller: d[1] as string,
      token: d[2] as string,
      amount: BigInt(d[3] as string),
      deadline: BigInt(d[4] as string),
      status: Number(d[5]),
      buyerApproved: Boolean(d[6]),
      sellerApproved: Boolean(d[7]),
    };
  } catch {
    return null;
  }
}

export async function fetchEscrowCount(): Promise<bigint> {
  if (!window.opnet) return 0n;
  try {
    const result = await window.opnet.callReadOnly({
      contractAddress: CONTRACT_ADDRESS,
      method: "get_escrow_count",
      args: [],
    });
    return BigInt((result?.decoded?.[0] as string) ?? 0);
  } catch {
    return 0n;
  }
}

export async function fetchTimeLeft(id: bigint): Promise<number> {
  if (!window.opnet) return 0;
  try {
    const result = await window.opnet.callReadOnly({
      contractAddress: CONTRACT_ADDRESS,
      method: "get_time_left",
      args: [id],
    });
    return Number(result?.decoded?.[0] ?? 0);
  } catch {
    return 0;
  }
}

export async function txDeposit(seller: string, token: string, amount: bigint, isNative: boolean) {
  if (!window.opnet) throw new Error("OP_WALLET not found");
  return window.opnet.signAndBroadcast({
    contractAddress: CONTRACT_ADDRESS,
    method: "deposit",
    args: [seller, token, amount],
    value: isNative ? amount : 0n,
  });
}

export async function txApprove(id: bigint) {
  if (!window.opnet) throw new Error("OP_WALLET not found");
  return window.opnet.signAndBroadcast({
    contractAddress: CONTRACT_ADDRESS,
    method: "approve",
    args: [id],
  });
}

export async function txRefund(id: bigint) {
  if (!window.opnet) throw new Error("OP_WALLET not found");
  return window.opnet.signAndBroadcast({
    contractAddress: CONTRACT_ADDRESS,
    method: "refund",
    args: [id],
  });
}
