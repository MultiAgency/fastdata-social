import type React from "react";

interface JsonViewProps {
  data: unknown;
}

export const JsonView: React.FC<JsonViewProps> = ({ data }) => {
  return (
    <pre className="bg-card border border-border rounded-xl p-4 text-foreground/90 text-sm font-mono overflow-auto max-h-[600px] m-0">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};
