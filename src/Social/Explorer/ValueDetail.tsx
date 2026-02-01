import React, { useEffect, useState } from "react";
import { fetchKeyDetail } from "./explorerApi";
import { Constants } from "../../hooks/constants";

interface ValueDetailProps {
  accountId: string;
  path: string;
  value: any;
}

export const ValueDetail: React.FC<ValueDetailProps> = ({ accountId, path, value }) => {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    fetchKeyDetail(accountId, path).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  }, [accountId, path]);

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
