import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Profile } from "../client/types";
import { FollowButton } from "../components/FollowButton";
import { TagBadge } from "../components/TagBadge";
import { useClient } from "../hooks/useClient";
import { useWallet } from "../providers/WalletProvider";

interface ProfileViewProps {
  accountId: string;
}

export function ProfileView({ accountId }: ProfileViewProps) {
  const client = useClient();
  const { accountId: signedInAccount } = useWallet();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEmpty(false);

    // Fetch profile independently from social counts so a follower/following
    // API failure doesn't blank the entire profile.
    const profileP = client.getProfile(accountId);
    const followersP = client
      .getFollowers(accountId, { limit: 1 })
      .catch(() => ({ accounts: [], count: 0 }));
    const followingP = client
      .getFollowing(accountId, { limit: 1 })
      .catch(() => ({ accounts: [], count: 0 }));
    const isFollowingP = signedInAccount
      ? client
          .getFollowing(signedInAccount)
          .then((res) => res.accounts.includes(accountId))
          .catch(() => false)
      : Promise.resolve(false);

    Promise.all([profileP, followersP, followingP, isFollowingP])
      .then(([p, followers, following, follows]) => {
        if (cancelled) return;
        if (!p || Object.keys(p).length === 0) {
          setEmpty(true);
        } else {
          setProfile(p);
        }
        setFollowerCount(followers.count);
        setFollowingCount(following.count);
        setIsFollowing(follows as boolean);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setEmpty(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, client, signedInAccount]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const imageUrl = profile?.image?.url;
  const name = profile?.name;
  const about = profile?.about ?? profile?.description;
  const tags = profile?.tags ? Object.keys(profile.tags) : [];
  const linktree = profile?.linktree ?? {};
  const isOwn = signedInAccount === accountId;
  const hasLinks = linktree.twitter || linktree.github || linktree.website;

  return (
    <div className="animate-fade-up">
      <div className="relative rounded-xl border border-border bg-card/50 overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />

        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12">
            {imageUrl && !imgError ? (
              <img
                src={imageUrl}
                alt={name ?? accountId}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-background shadow-lg"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center text-primary text-3xl font-semibold">
                {(name ?? accountId).charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0 pb-1">
              {name && (
                <h1 className="text-2xl font-semibold tracking-tight leading-tight">{name}</h1>
              )}
              <p className="text-sm text-muted-foreground font-mono truncate">{accountId}</p>
            </div>

            <div className="flex items-center gap-2 pb-1">
              {isOwn ? (
                <Link to="/profile/edit">
                  <Button variant="outline" size="sm" className="font-mono">
                    edit_
                  </Button>
                </Link>
              ) : (
                <FollowButton
                  targetAccountId={accountId}
                  isFollowing={isFollowing}
                  onToggle={(now) => {
                    setIsFollowing(now);
                    setFollowerCount((c) => c + (now ? 1 : -1));
                  }}
                />
              )}
            </div>
          </div>

          {/* Counts */}
          <div className="mt-4 flex gap-4">
            <Link
              to="/profile/$accountId/followers"
              params={{ accountId }}
              className="text-sm hover:text-primary transition-colors"
            >
              <span className="font-semibold">{followerCount}</span>{" "}
              <span className="text-muted-foreground">followers</span>
            </Link>
            <Link
              to="/profile/$accountId/following"
              params={{ accountId }}
              className="text-sm hover:text-primary transition-colors"
            >
              <span className="font-semibold">{followingCount}</span>{" "}
              <span className="text-muted-foreground">following</span>
            </Link>
          </div>

          {about && (
            <p className="mt-4 text-sm text-foreground/80 leading-relaxed max-w-prose">{about}</p>
          )}

          {(tags.length > 0 || hasLinks) && (
            <div className="mt-5 pt-5 border-t border-border/50 flex flex-wrap items-center gap-x-5 gap-y-3">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                </div>
              )}

              {tags.length > 0 && hasLinks && (
                <span className="hidden sm:block w-px h-4 bg-border" />
              )}

              {hasLinks && (
                <div className="flex flex-wrap items-center gap-3">
                  {linktree.twitter && (
                    <a
                      href={`https://x.com/${linktree.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span className="font-mono text-xs">{linktree.twitter}</span>
                    </a>
                  )}
                  {linktree.github && (
                    <a
                      href={`https://github.com/${linktree.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      <span className="font-mono text-xs">{linktree.github}</span>
                    </a>
                  )}
                  {linktree.website && (
                    <a
                      href={
                        linktree.website.startsWith("http")
                          ? linktree.website
                          : `https://${linktree.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                      <span className="font-mono text-xs">
                        {linktree.website.replace(/^https?:\/\//, "")}
                      </span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {empty && (
            <div className="mt-5 pt-5 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                This account hasn't set up a profile yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
