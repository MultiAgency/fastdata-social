import { Badge } from "@/components/ui/badge";

interface TagBadgeProps {
  tag: string;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <Badge variant="secondary" className="font-mono text-xs">
      {tag}
    </Badge>
  );
}
