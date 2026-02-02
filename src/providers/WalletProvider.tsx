import { NearConnector } from "@hot-labs/near-connect";
import { NearProvider } from "@near-kit/react";
import { fromHotConnect, Near } from "near-kit";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Constants } from "../hooks/constants";
import { isValidNearAccount } from "../utils/validation";

interface WalletContextType {
  accountId: string | null;
  isConnected: boolean;
  isInitializing: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  error: Error | null;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

// Helper: Validate network configuration
function validateNetwork(networkId: string): "mainnet" | "testnet" {
  if (networkId !== "mainnet" && networkId !== "testnet") {
    throw new Error(`Invalid network: ${networkId}. Must be "mainnet" or "testnet"`);
  }
  return networkId;
}

// Helper: Create Near instance (DRY principle)
function createNearInstance(connector: NearConnector, network: "mainnet" | "testnet"): Near {
  return new Near({
    network,
    wallet: fromHotConnect(connector as unknown as Parameters<typeof fromHotConnect>[0]),
  });
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [near, setNear] = useState<Near | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [connector, setConnector] = useState<NearConnector | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let hotConnector: NearConnector | null = null;

    const initWallet = async () => {
      try {
        const network = validateNetwork(Constants.NETWORK.networkId);
        hotConnector = new NearConnector({ network });

        setConnector(hotConnector);

        // Check if already connected
        try {
          const connectedWallet = await hotConnector.getConnectedWallet();
          if (
            mounted &&
            connectedWallet &&
            connectedWallet.accounts &&
            connectedWallet.accounts.length > 0
          ) {
            const accountId = connectedWallet.accounts[0].accountId;

            // Security: Validate account ID format
            if (!isValidNearAccount(accountId)) {
              if (mounted) {
                setError(new Error("Invalid account ID format from wallet"));
              }
              return;
            }

            const nearInstance = createNearInstance(hotConnector, network);
            setNear(nearInstance);
            setAccountId(accountId);
            setIsConnected(true);
          }
        } catch {
          // No existing connection — expected on fresh visit
        }

        // Listen for sign in events
        hotConnector.on("wallet:signIn", async (data) => {
          if (!mounted) return;

          if (!data.accounts || data.accounts.length === 0) {
            if (mounted) {
              setError(new Error("No accounts available in wallet"));
            }
            return;
          }

          const accountId = data.accounts[0].accountId;

          if (!isValidNearAccount(accountId)) {
            if (mounted) {
              setError(new Error("Invalid account ID format from wallet"));
            }
            return;
          }

          if (!hotConnector) return;
          const nearInstance = createNearInstance(hotConnector, network);

          setNear(nearInstance);
          setAccountId(accountId);
          setIsConnected(true);
          setError(null);
        });

        // Listen for sign out events
        hotConnector.on("wallet:signOut", () => {
          if (!mounted) return;

          setNear(null);
          setAccountId(null);
          setIsConnected(false);
          setError(null);
        });
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Failed to initialize wallet"));
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    initWallet();

    // Cleanup function to prevent memory leaks
    return () => {
      mounted = false;
      // ✅ Clean up the actual connector instance, not state
      if (hotConnector) {
        hotConnector.removeAllListeners("wallet:signIn");
        hotConnector.removeAllListeners("wallet:signOut");
      }
    };
  }, []);

  const connectWallet = async () => {
    if (!connector || isInitializing) return;

    try {
      setError(null);
      await connector.connect();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to connect wallet");
      setError(error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    if (!connector) return;

    try {
      setError(null);
      await connector.disconnect();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to disconnect wallet");
      setError(error);
      throw error;
    }
  };

  const clearError = () => setError(null);

  const walletValue: WalletContextType = {
    accountId,
    isConnected,
    isInitializing,
    connectWallet,
    disconnectWallet,
    error,
    clearError,
  };

  // If we have a near instance, wrap children with NearProvider
  // Otherwise just provide wallet context for connection UI
  if (near) {
    return (
      <WalletContext.Provider value={walletValue}>
        <NearProvider near={near}>{children}</NearProvider>
      </WalletContext.Provider>
    );
  }

  return <WalletContext.Provider value={walletValue}>{children}</WalletContext.Provider>;
}
