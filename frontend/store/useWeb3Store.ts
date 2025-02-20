import { create } from "zustand";

interface Web3State {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  setAddress: (address: string | null) => void;
  setBalance: (balance: string | null) => void;
  setConnected: (status: boolean) => void;
}

export const useWeb3Store = create<Web3State>((set) => ({
  address: null,
  balance: null,
  isConnected: false,
  setAddress: (address) => set({ address }),
  setBalance: (balance) => set({ balance }),
  setConnected: (status) => set({ isConnected: status }),
}));
