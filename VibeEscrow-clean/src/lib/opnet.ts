import { useState, useCallback } from "react";
import { connectWallet, getWalletBalance } from "../lib/opnet";

export interface WalletState {
  address:     string | null;
  publicKey:   string | null;
  btcBalance:  bigint;
  connected:   boolean;
  connecting:  boolean;
  error:       string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address:    null,
    publicKey:  null,
    btcBalance: 0n,
    connected:  false,
    connecting: false,
    error:      null,
  });

  const connect = useCallback(async () => {
    setState(s => ({ ...s, connecting: true, error: null }));
    try {
      const { address, publicKey } = await connectWallet();
      const { confirmed } = await getWalletBalance();
      setState({
        address,
        publicKey,
        btcBalance: confirmed,
        connected:  true,
        connecting: false,
        error:      null,
      });
    } catch (e: unknown) {
      setState(s => ({
        ...s,
        connecting: false,
        error: e instanceof Error ? e.message : "Connection failed",
      }));
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!state.connected) return;
    try {
      const { confirmed } = await getWalletBalance();
      setState(s => ({ ...s, btcBalance: confirmed }));
    } catch {
      // ignore
    }
  }, [state.connected]);

  return { ...state, connect, refreshBalance };
}
