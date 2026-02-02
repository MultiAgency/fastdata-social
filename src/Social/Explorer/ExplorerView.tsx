import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClient } from "../../hooks/useClient";
import { Breadcrumb } from "./Breadcrumb";
import { JsonView } from "./JsonView";
import { TreeNode } from "./TreeNode";
import { ValueDetail } from "./ValueDetail";

interface ExplorerViewProps {
  accountId: string;
}

const QUICK_PATHS = ["profile", "graph", "index"];

export const ExplorerView: React.FC<ExplorerViewProps> = ({ accountId: initialAccountId }) => {
  const client = useClient();
  const [currentAccount, setCurrentAccount] = useState(initialAccountId);
  const [contractId, setContractId] = useState("contextual.near");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown> | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<unknown>(null);
  const [viewMode, setViewMode] = useState<"tree" | "json">("tree");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: client is a singleton, methods are stable
  const explore = useCallback(
    async (pattern?: string) => {
      const q = pattern || query || `${currentAccount}/*`;
      setLoading(true);
      setError(null);
      setSelectedPath(null);
      try {
        const keysResult = await client.socialKeys([q], { contractId });
        if (Object.keys(keysResult).length === 0) {
          setError("No data found");
          setData(null);
          setRawData(null);
        } else {
          setData(keysResult);
          const valResult = await client.socialGet([q], { contractId });
          setRawData(valResult);
        }
      } catch (_e) {
        setError("Failed to fetch data");
      }
      setLoading(false);
    },
    [query, currentAccount, contractId],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: explore intentionally excluded to avoid re-fetch on query/contractId changes
  useEffect(() => {
    setBreadcrumb([currentAccount]);
    explore(`${currentAccount}/*`);
    // Only re-fetch when the account changes, not on query/contractId edits.
    // explore is intentionally excluded — it closes over query/contractId
    // which would cause spurious re-fetches on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount]);

  const handleQuickPath = (path: string) => {
    const pattern = `${currentAccount}/${path}/**`;
    setQuery(pattern);
    setBreadcrumb([currentAccount, path]);
    explore(pattern);
  };

  const handleBreadcrumbNav = (segments: string[]) => {
    if (segments.length === 1) {
      setCurrentAccount(segments[0]);
      setQuery("");
    } else {
      const path = segments.slice(1).join("/");
      const pattern = `${segments[0]}/${path}/**`;
      setQuery(pattern);
      setBreadcrumb(segments);
      explore(pattern);
    }
  };

  const handleSelect = (path: string, value: unknown) => {
    setSelectedPath(path);
    setSelectedValue(value);
  };

  const handleNavigate = (newAccountId: string) => {
    setCurrentAccount(newAccountId);
    setQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const parts = query.replace(/\/?\*+$/, "").split("/");
      setBreadcrumb(parts);
      explore(query);
    } else {
      explore();
    }
  };

  const treeEntries: [string, unknown][] = data
    ? Object.entries(data).flatMap(([_acct, val]) =>
        typeof val === "object" && val !== null
          ? Object.entries(val as Record<string, unknown>).map(
              ([k, v]) => [k, v] as [string, unknown],
            )
          : [],
      )
    : [];

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <label
          htmlFor="contract-input"
          className="text-xs text-muted-foreground font-mono shrink-0"
        >
          contract
        </label>
        <Input
          id="contract-input"
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          className="font-mono bg-secondary/50 text-sm max-w-[240px]"
        />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`${currentAccount}/**`}
          className="flex-1 bg-secondary/50 border-border font-mono text-sm placeholder:text-muted-foreground/50"
        />
        <Button type="submit" disabled={loading} className="glow-primary font-mono text-sm">
          {loading ? "..." : "explore_"}
        </Button>
      </form>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {QUICK_PATHS.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => handleQuickPath(p)}
            className="bg-secondary border border-border rounded-lg px-2.5 py-1 text-muted-foreground text-xs cursor-pointer font-mono hover:border-primary/30 hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={`Explore ${p}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <Breadcrumb segments={breadcrumb} onNavigate={handleBreadcrumbNav} />
      </div>

      <div className="flex gap-1 mb-4">
        <button
          type="button"
          onClick={() => setViewMode("tree")}
          aria-label="Tree view"
          aria-pressed={viewMode === "tree"}
          className={`border border-border rounded-lg px-3 py-1.5 text-xs cursor-pointer font-mono transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
            viewMode === "tree"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          tree
        </button>
        <button
          type="button"
          onClick={() => setViewMode("json")}
          aria-label="JSON view"
          aria-pressed={viewMode === "json"}
          className={`border border-border rounded-lg px-3 py-1.5 text-xs cursor-pointer font-mono transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
            viewMode === "json"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          json
        </button>
      </div>

      {error && (
        <div className="bg-card border border-border rounded-xl p-4 text-destructive text-sm mb-4 flex items-center justify-between">
          <span className="font-mono">{error}</span>
          <button
            type="button"
            onClick={() => explore()}
            className="bg-secondary border border-border rounded-lg px-3 py-1 text-foreground text-xs cursor-pointer font-mono hover:border-primary/30 transition-colors"
          >
            retry_
          </button>
        </div>
      )}

      {viewMode === "json" ? (
        rawData && <JsonView data={rawData} />
      ) : (
        <div className="flex gap-4">
          <div
            className={`${selectedPath ? "flex-1" : "w-full"} min-w-0 bg-card border border-border rounded-xl p-4 max-h-[600px] overflow-auto`}
          >
            {loading && !data && (
              <div className="text-muted-foreground font-mono text-sm">loading_</div>
            )}
            {treeEntries.map(([key, val]) => (
              <TreeNode
                key={key}
                name={key}
                value={val}
                path={key}
                depth={0}
                accountId={currentAccount}
                onSelect={handleSelect}
                onNavigate={handleNavigate}
              />
            ))}
            {!loading && treeEntries.length === 0 && !error && (
              <div className="text-muted-foreground text-sm font-mono italic">no data</div>
            )}
          </div>
          {selectedPath && (
            <div className="w-[360px] shrink-0">
              <ValueDetail
                accountId={currentAccount}
                path={selectedPath}
                value={selectedValue}
                contractId={contractId}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
