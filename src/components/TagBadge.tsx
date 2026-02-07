import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";

interface TagBadgeProps {
  tag: string;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <Link to="/" search={{ tag }}>
      <Badge
        variant="secondary"
        className="font-mono text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
      >
        {tag}
      </Badge>
    </Link>
  );
}
