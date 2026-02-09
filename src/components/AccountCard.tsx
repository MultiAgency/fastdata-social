import { Link } from "@tanstack/react-router";
import { memo, useEffect, useState } from "react";
import type { Profile } from "../client/types";
import { useClient } from "../hooks/useClient";
import { FollowButton } from "./FollowButton";
import { ProfileHeader } from "./ProfileHeader";
import { TagBadge } from "./TagBadge";

interface AccountCardProps {
  accountId: string;
  /** Pre-fetched profile. When omitted the card fetches its own. */
  profile?: Profile | null;
  isFollowing?: boolean;
  onFollowToggle?: (accountId: string, nowFollowing: boolean) => void;
}

export const AccountCard = memo(function AccountCard({
  accountId,
  profile: profileProp,
  isFollowing = false,
  onFollowToggle,
}: AccountCardProps) {
  const client = useClient();
  const [fetched, setFetched] = useState<Profile | null>(null);

  // Only fetch when no profile prop is provided (backward-compat path)
  useEffect(() => {
    if (profileProp !== undefined) return;
    let cancelled = false;
    client
      .getProfile(accountId)
      .then((p) => {
        if (!cancelled && p && Object.keys(p).length > 0) setFetched(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId, client, profileProp]);

  const profile = profileProp !== undefined ? profileProp : fetched;
  const tags = profile?.tags ? Object.keys(profile.tags) : [];
  const about = profile?.about ?? profile?.description;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <Link to="/profile/$accountId" params={{ accountId }} className="min-w-0 flex-1">
          <ProfileHeader
            accountId={accountId}
            name={profile?.name}
            imageUrl={profile?.image?.url}
            size="sm"
          />
        </Link>
        <FollowButton
          targetAccountId={accountId}
          isFollowing={isFollowing}
          onToggle={(now) => onFollowToggle?.(accountId, now)}
        />
      </div>
      {about && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{about}</p>
      )}
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.slice(0, 4).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
});
