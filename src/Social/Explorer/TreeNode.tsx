import React, { useState, useCallback } from "react";
import { fetchKeys } from "./explorerApi";

interface TreeNodeProps {
  name: string;
  value: any;
  path: string;
  depth: number;
  accountId: string;
  onSelect: (path: string, value: any) => void;
  onNavigate: (accountId: string) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  name,
  value,
  path,
  depth,
  accountId,
  onSelect,
  onNavigate,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<Record<string, any> | null>(
    typeof value === "object" && value !== null ? value : null
  );
  const [loading, setLoading] = useState(false);

  const isBranch = typeof value === "object" && value !== null;
  const isNearAccount = name.endsWith(".near") || name.endsWith(".tg");

  const toggle = useCallback(async () => {
    if (!isBranch) return;
    if (!expanded && children && Object.keys(children).length === 0) {
      setLoading(true);
      const data = await fetchKeys([`${accountId}/${path}/*`]);
      const parts = path.split("/");
      let node: any = data[accountId];
      for (const p of parts) {
        if (node && typeof node === "object") node = node[p];
        else { node = null; break; }
      }
      setChildren(node && typeof node === "object" ? node : {});
      setLoading(false);
    }
    setExpanded(!expanded);
  }, [expanded, children, isBranch, accountId, path]);

  const handleClick = () => {
    if (isBranch) {
      toggle();
    } else {
      onSelect(path, value);
    }
  };

  const handleAccountClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onNavigate(name);
  };

  const childEntries = children ? Object.entries(children) : [];
  const hasLoadedChildren = children !== null && Object.keys(children).length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className={depth > 0 ? "ml-5" : ""}>
      <div
        role="treeitem"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer text-sm font-mono transition-colors hover:bg-secondary w-full text-left focus-visible:outline-2 focus-visible:outline-ring"
        aria-expanded={isBranch ? expanded : undefined}
        aria-label={isBranch ? `${expanded ? "Collapse" : "Expand"} ${name}` : `Select ${name}`}
      >
        {isBranch ? (
          <span className="text-muted-foreground w-3.5 text-center shrink-0 text-xs" aria-hidden="true">
            {loading ? "..." : expanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="text-muted-foreground/50 w-3.5 text-center shrink-0 text-xs" aria-hidden="true">=</span>
        )}
        {isNearAccount ? (
          <button
            type="button"
            onClick={handleAccountClick}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleAccountClick(e); } }}
            className="text-accent cursor-pointer hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded"
          >
            {name}
          </button>
        ) : (
          <span className={isBranch ? "text-primary" : "text-foreground/80"}>{name}</span>
        )}
        {!isBranch && value !== null && value !== undefined && (
          <span className="text-muted-foreground ml-1 overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px] text-xs">
            {typeof value === "string" ? (value.length > 60 ? value.slice(0, 60) + "..." : value) : JSON.stringify(value)}
          </span>
        )}
      </div>
      {expanded && hasLoadedChildren && childEntries.map(([key, val]) => (
        <TreeNode
          key={key}
          name={key}
          value={val}
          path={`${path}/${key}`}
          depth={depth + 1}
          accountId={accountId}
          onSelect={onSelect}
          onNavigate={onNavigate}
        />
      ))}
      {expanded && children && Object.keys(children).length === 0 && !loading && (
        <div className="ml-[34px] text-muted-foreground text-xs font-mono italic">
          (empty)
        </div>
      )}
    </div>
  );
};
