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
      connect:    () => Promise<{ address: string; publicKey: string }>;
      getBalance: () => Promise<{ confirmed: bigint; unconfirmed: bigint }>;
      callReadOnly: (params: {
        contractAddress: string;
        method:  string;
        args:    unknown[];
      }) => Promise<{ status: string; decoded: unknown[] } | null>;
      signAndBroadcast: (params: {
        contractAddress: string;
        method:  string;
        args:    unknown[];
        value?:  bigint;
      }) => Promise<{ txId: string }>;
    };
  }
}

export function isWalletAvailable(): boolean {
  return typeof window !== "undefined" && !!window.opnet;
}

export async function connectWallet(): Promise<{ address: string; publicKey: string }> {
  if (!window.opnet) throw new Error("OP_WALLET not found. Install from opnet.org");
  return window.opnet.connect();
}

export async function getWalle
