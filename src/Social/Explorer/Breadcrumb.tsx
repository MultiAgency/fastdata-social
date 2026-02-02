import React from "react";

interface BreadcrumbProps {
  segments: string[];
  onNavigate: (segments: string[]) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ segments, onNavigate }) => {
  return (
    <div className="flex items-center gap-1 flex-wrap text-sm font-mono">
      <button
        type="button"
        onClick={() => onNavigate(segments.slice(0, 1))}
        className="cursor-pointer text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded"
        aria-label="Navigate to root"
      >
        ~
      </button>
      {segments.map((seg, i) => (
        <React.Fragment key={seg}>
          <span className="text-muted-foreground/40" aria-hidden="true">
            /
          </span>
          {i < segments.length - 1 ? (
            <button
              type="button"
              onClick={() => onNavigate(segments.slice(0, i + 1))}
              className="cursor-pointer text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded"
              aria-label={`Navigate to ${seg}`}
            >
              {seg}
            </button>
          ) : (
            <span className="text-foreground" aria-current="location">
              {seg}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
