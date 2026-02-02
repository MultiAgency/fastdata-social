import type React from "react";
import { useEffect, useState } from "react";
import type { KvEntry } from "../../client/types";
import { Constants } from "../../hooks/constants";
import { useClient } from "../../hooks/useClient";

interface ValueDetailProps {
  accountId: string;
  path: string;
  value: unknown;
  contractId?: string;
}

export const ValueDetail: React.FC<ValueDetailProps> = ({ accountId, path, value, contractId }) => {
  const client = useClient();
  const [detail, setDetail] = useState<KvEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: client is a singleton, methods are stable
  useEffect(() => {
    setLoading(true);
    setDetail(null);
    setError(false);
    client
      .kvGet({
        predecessorId: accountId,
        currentAccountId: contractId || "contextual.near",
        key: path,
      })
      .then((d) => {
        setDetail(d);
      })
      .catch((err) => {
        // biome-ignore lint/suspicious/noConsole: error logging
        console.error(`Failed to load detail for ${path}:`, err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accountId, path, contractId]);

  const formattedValue = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  return (
    <div className="bg-card border border-border rounded-xl p-4 text-sm">
      <div className="text-muted-foreground mb-3 font-mono text-xs">
        {accountId}/{path}
      </div>
      <pre className="bg-secondary rounded-lg p-3 text-foreground/90 font-mono text-xs overflow-auto max-h-[300px] mb-3 whitespace-pre-wrap break-all border border-border">
        {formattedValue}
      </pre>
      {loading && <div className="text-muted-foreground font-mono text-xs">loading metadata_</div>}
      {error && <div className="text-muted-foreground font-mono text-xs">failed_</div>}
      {detail && (
        <div className="flex flex-col gap-2 text-xs font-mono">
          {detail.block_height && (
            <div>
              <span className="text-muted-foreground">block: </span>
              <span className="text-foreground/80">{detail.block_height}</span>
            </div>
          )}
          {detail.tx_hash && (
            <div>
              <span className="text-muted-foreground">tx: </span>
              <a
                href={`${Constants.EXPLORER_URL}/${detail.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {detail.tx_hash.slice(0, 12)}...
              </a>
            </div>
          )}
          {detail.predecessor_id && (
            <div>
              <span className="text-muted-foreground">writer: </span>
              <span className="text-accent">{detail.predecessor_id}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
