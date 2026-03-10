// Update CONTRACT_ADDRESS after deploying to testnet/mainnet
export const CONTRACT_ADDRESS =
  (import.meta.env.VITE_CONTRACT_ADDRESS as string) ||
  "bc1p__REPLACE_AFTER_DEPLOY__";

export const NETWORK: "mainnet" | "testnet" = "testnet";

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const STATUS_LABEL: Record<number, string> = {
  0: "Pending",
  1: "Released",
  2: "Refunded",
};


export const NATIVE_BTC = "";
