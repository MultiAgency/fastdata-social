import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildFollowArgs, buildProfileArgs, buildUnfollowArgs } from "../client";
import type { Profile } from "../client/types";
import { FollowButton } from "../components/FollowButton";
import { TagBadge } from "../components/TagBadge";
import { Constants } from "../hooks/constants";
import { encodeFfs } from "../hooks/fastfs";
import { useClient } from "../hooks/useClient";
import { cn } from "../lib/utils";
import { useWallet } from "../providers/WalletProvider";
import { AccountList } from "../Social/AccountList";
import { TransactionAlert } from "../Social/TransactionAlert";
import type { FastfsData, Transaction } from "../types";
import { getTxExplorerUrl, isValidNearAccount } from "../utils/validation";

const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_RAW_BYTES = 5_000_000;
const MAX_DIM = 512;
const JPEG_QUALITY = 0.85;

/** Resize and compress any accepted image to a static JPEG (max 512px, 85% quality).
 *  Intentionally strips transparency (PNG/WebP) and animation (GIF) for avatar use. */
async function resizeToJpeg(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    if (width > MAX_DIM || height > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("Failed to compress image");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

interface ProfileViewProps {
  accountId: string;
}

export function ProfileView({ accountId }: ProfileViewProps) {
  const client = useClient();
  const { accountId: signedInAccount, near } = useWallet();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editTxHash, setEditTxHash] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Own-profile follow management
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [followersList, setFollowersList] = useState<string[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [transacting, setTransacting] = useState(false);
  const [lastTx, setLastTx] = useState<Transaction | null>(null);
  const [pendingAccount, setPendingAccount] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEmpty(false);

    const profileP = client.getProfile(accountId);
    const followersP = client
      .getFollowers(accountId, { limit: 1 })
      .catch(() => ({ accounts: [], count: 0 }));
    const followingP = client
      .getFollowing(accountId, { limit: 1 })
      .catch(() => ({ accounts: [], count: 0 }));
    const isFollowingP = signedInAccount
      ? client
          .kvGet({
            predecessorId: signedInAccount,
            currentAccountId: Constants.KV_CONTRACT_ID,
            key: `graph/follow/${accountId}`,
          })
          .then((entry) => entry !== null && entry.value !== null)
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

  const isOwn = signedInAccount === accountId;

  // Populate edit fields when entering edit mode
  const enterEditMode = useCallback(() => {
    setEditName(profile?.name ?? "");
    setEditImageUrl(profile?.image?.url ?? "");
    setEditAbout(profile?.about ?? profile?.description ?? "");
    setEditTags(profile?.tags ? Object.keys(profile.tags).join(", ") : "");
    setEditError(null);
    setEditTxHash(null);
    setEditing(true);
  }, [profile]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditError(null);
    setEditTxHash(null);
  }, []);

  // Build KV args from edit fields
  const kvArgs = useMemo(() => {
    if (!editing) return {};
    const parsed = parseTags(editTags);
    return buildProfileArgs(accountId, {
      name: editName || undefined,
      image_url: editImageUrl || undefined,
      about: editAbout || undefined,
      tags: parsed.length > 0 ? parsed : undefined,
    });
  }, [editing, accountId, editName, editImageUrl, editAbout, editTags]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!near || !signedInAccount) return;
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        setEditError("Select an image file (PNG, JPEG, WebP, or GIF)");
        return;
      }
      if (file.size > MAX_RAW_BYTES) {
        setEditError("Image too large (max 5 MB)");
        return;
      }

      setUploading(true);
      setEditError(null);

      try {
        const resized = await resizeToJpeg(file);
        const path = `profile/avatar-${Date.now()}.jpg`;

        const ffs: FastfsData = {
          simple: {
            relativePath: path,
            content: { mimeType: "image/jpeg", content: resized },
          },
        };

        await near
          .transaction(signedInAccount)
          .functionCall(Constants.CONTRACT_ID, "__fastdata_fastfs", encodeFfs(ffs), {
            gas: "10 Tgas",
          })
          .send();

        const url = `https://${signedInAccount}.fastfs.io/${Constants.CONTRACT_ID}/${path}`;
        setEditImageUrl(url);
        setImgError(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setEditError(message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [near, signedInAccount],
  );

  const handleCommit = useCallback(async () => {
    if (!near || !signedInAccount) return;
    setCommitting(true);
    setEditError(null);
    setEditTxHash(null);

    try {
      const result = await near
        .transaction(signedInAccount)
        .functionCall(Constants.KV_CONTRACT_ID, "__fastdata_kv", kvArgs, { gas: "10 Tgas" })
        .send();

      const hash = result?.transaction?.hash as string | undefined;
      if (hash) {
        setEditTxHash(hash);
        // Update local profile state so the view reflects changes immediately
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                name: editName || undefined,
                image: editImageUrl ? { url: editImageUrl } : prev.image,
                about: editAbout || undefined,
                tags:
                  parseTags(editTags).length > 0
                    ? Object.fromEntries(parseTags(editTags).map((t) => [t, ""]))
                    : prev.tags,
              }
            : prev,
        );
        setImgError(false);
        setEmpty(false);
        // Exit edit mode after short delay so user sees the success message
        timeoutRefs.current.push(
          setTimeout(() => {
            setEditing(false);
            setEditTxHash(null);
          }, 2000),
        );
      } else {
        setEditError("Transaction was not confirmed");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setEditError(message);
    } finally {
      setCommitting(false);
    }
  }, [near, signedInAccount, kvArgs, editName, editImageUrl, editAbout, editTags]);

  // Load full following/followers lists for own profile
  // biome-ignore lint/correctness/useExhaustiveDependencies: client is a singleton
  const loadSocialData = useCallback(async () => {
    if (!signedInAccount || !isOwn) return;
    setSocialLoading(true);
    try {
      const [followingRes, followersRes] = await Promise.all([
        client.getFollowing(signedInAccount),
        client.getFollowers(signedInAccount),
      ]);
      setFollowingList(followingRes.accounts);
      setFollowersList(followersRes.accounts);
      setFollowingCount(followingRes.count);
      setFollowerCount(followersRes.count);
    } catch {
      // counts already set from initial load
    }
    setSocialLoading(false);
  }, [signedInAccount, isOwn]);

  useEffect(() => {
    loadSocialData();
  }, [loadSocialData]);

  // Clear any pending timeouts on unmount
  useEffect(
    () => () => {
      for (const id of timeoutRefs.current) clearTimeout(id);
    },
    [],
  );

  const validateAccount = useCallback(
    (account: string): boolean => {
      if (!account) {
        setValidationError("Please enter an account ID");
        return false;
      }
      if (!isValidNearAccount(account)) {
        setValidationError("Invalid NEAR account format");
        return false;
      }
      if (account === signedInAccount) {
        setValidationError("You cannot follow yourself");
        return false;
      }
      setValidationError("");
      return true;
    },
    [signedInAccount],
  );

  const handleFollow = useCallback(
    async (targetAccount: string) => {
      if (!validateAccount(targetAccount)) return;
      if (followingList.includes(targetAccount)) {
        setValidationError("Already following this account");
        return;
      }
      if (!signedInAccount || !near) return;
      setTransacting(true);
      setValidationError("");

      try {
        const followArgs = buildFollowArgs(signedInAccount, targetAccount);
        const result = await near
          .transaction(signedInAccount)
          .functionCall(Constants.KV_CONTRACT_ID, "__fastdata_kv", followArgs, { gas: "10 Tgas" })
          .send();
        const txId = (result?.transaction?.hash as string) || null;
        setFollowingList((prev) => [...prev, targetAccount]);
        setFollowingCount((c) => c + 1);
        setLastTx({ type: "follow", account: targetAccount, txId, status: "success" });
        setPendingAccount("");
        timeoutRefs.current.push(setTimeout(loadSocialData, 3000));
      } catch {
        setLastTx({
          type: "follow",
          account: targetAccount,
          txId: null,
          status: "error",
          error: true,
        });
        setPendingAccount("");
        timeoutRefs.current.push(setTimeout(loadSocialData, 3000));
      } finally {
        setTransacting(false);
      }
    },
    [followingList, signedInAccount, near, validateAccount, loadSocialData],
  );

  const handleUnfollow = useCallback(
    async (targetAccount: string) => {
      if (!signedInAccount || !near) return;
      setTransacting(true);

      try {
        const unfollowArgs = buildUnfollowArgs(signedInAccount, targetAccount);
        const result = await near
          .transaction(signedInAccount)
          .functionCall(Constants.KV_CONTRACT_ID, "__fastdata_kv", unfollowArgs, { gas: "10 Tgas" })
          .send();
        const txId = (result?.transaction?.hash as string) || null;
        setFollowingList((prev) => prev.filter((id) => id !== targetAccount));
        setFollowingCount((c) => c - 1);
        setLastTx({ type: "unfollow", account: targetAccount, txId, status: "success" });
        timeoutRefs.current.push(setTimeout(loadSocialData, 3000));
      } catch {
        setLastTx({
          type: "unfollow",
          account: targetAccount,
          txId: null,
          status: "error",
          error: true,
        });
        timeoutRefs.current.push(setTimeout(loadSocialData, 3000));
      } finally {
        setTransacting(false);
      }
    },
    [signedInAccount, near, loadSocialData],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const imageUrl = editing ? editImageUrl : profile?.image?.url;
  const name = editing ? editName : profile?.name;
  const about = editing ? editAbout : (profile?.about ?? profile?.description);
  const tags = editing ? parseTags(editTags) : profile?.tags ? Object.keys(profile.tags) : [];

  return (
    <div className="animate-fade-up space-y-4 sm:space-y-6">
      {/* Edit mode alerts */}
      {editing && editTxHash && (
        <Alert variant="default" className="border-l-2 border-l-primary bg-primary/5">
          <AlertDescription>
            <span className="font-semibold text-primary">Profile updated</span>
            <span className="text-sm text-muted-foreground font-mono ml-2">indexing (~2-3s)</span>
            <span className="mx-2 text-muted-foreground">&middot;</span>
            <a
              href={getTxExplorerUrl(editTxHash, Constants.EXPLORER_URL)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-primary hover:underline"
            >
              view tx &rarr;
            </a>
          </AlertDescription>
        </Alert>
      )}
      {editing && editError && (
        <Alert variant="default" className="border-l-2 border-l-accent bg-accent/5">
          <AlertDescription>
            <span className="font-semibold text-destructive">{editError}</span>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setEditError(null)}
            aria-label="Close"
          >
            &times;
          </Button>
        </Alert>
      )}

      {/* Profile Card */}
      <div className="relative rounded-2xl border border-border/50 bg-card/40 overflow-hidden backdrop-blur-sm">
        {/* Banner */}
        <div className="h-24 sm:h-32 profile-gradient dot-pattern" />

        {/* Avatar + Actions row */}
        <div className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-10 sm:-mt-12">
            {/* Avatar */}
            <div className="shrink-0 self-start">
              {editing ? (
                <button
                  type="button"
                  className="relative w-20 h-20 sm:w-24 sm:h-24 cursor-pointer group block p-0 border-0 bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) uploadImage(file);
                  }}
                >
                  {editImageUrl ? (
                    <img
                      src={editImageUrl}
                      alt="avatar"
                      className={cn(
                        "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-[3px] border-background shadow-lg shadow-black/20 ring-1 ring-border/50",
                        dragOver && "ring-2 ring-primary",
                      )}
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-[3px] border-background shadow-lg shadow-black/20 ring-1 ring-border/50 flex items-center justify-center",
                        dragOver && "ring-2 ring-primary",
                      )}
                    >
                      <span className="text-primary text-2xl sm:text-3xl font-semibold">
                        {(editName || accountId).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {uploading ? (
                    <span className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </span>
                  ) : (
                    <span className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </span>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(file);
                    }}
                  />
                </button>
              ) : imageUrl && !imgError ? (
                <img
                  src={imageUrl}
                  alt={name ?? accountId}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-[3px] border-background shadow-lg shadow-black/20 ring-1 ring-border/50"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-[3px] border-background shadow-lg shadow-black/20 ring-1 ring-border/50 flex items-center justify-center">
                  <span className="text-primary text-2xl sm:text-3xl font-semibold">
                    {(name ?? accountId).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name + Account ID */}
            <div className="flex-1 min-w-0 pb-0 sm:pb-1">
              {editing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Display name"
                  disabled={committing}
                  className="font-semibold text-xl sm:text-2xl tracking-tight bg-transparent border-border/40 h-auto py-1 px-2 -ml-2"
                />
              ) : name ? (
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight">
                  {name}
                </h1>
              ) : null}
              <p className="text-xs sm:text-sm text-muted-foreground font-mono truncate mt-0.5">
                {accountId}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pb-1 -mt-1 sm:mt-0">
              {isOwn ? (
                editing ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-mono rounded-lg text-xs h-8"
                      onClick={cancelEdit}
                      disabled={committing}
                    >
                      cancel_
                    </Button>
                    <Button
                      size="sm"
                      className="font-mono rounded-lg text-xs h-8 glow-primary"
                      onClick={handleCommit}
                      disabled={committing || Object.keys(kvArgs).length === 0}
                    >
                      {committing ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      ) : (
                        "save_"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono rounded-lg text-xs h-8 gap-1.5"
                    onClick={enterEditMode}
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
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    edit_
                  </Button>
                )
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

          {/* Stats bar */}
          <div className="mt-4 flex items-center gap-5">
            <Link
              to="/profile/$accountId/followers"
              params={{ accountId }}
              className="group flex items-baseline gap-1.5 text-sm hover:text-primary transition-colors"
            >
              <span className="font-semibold text-base tabular-nums">{followerCount}</span>
              <span className="text-muted-foreground text-xs group-hover:text-primary/70 transition-colors">
                followers
              </span>
            </Link>
            <Link
              to="/profile/$accountId/following"
              params={{ accountId }}
              className="group flex items-baseline gap-1.5 text-sm hover:text-primary transition-colors"
            >
              <span className="font-semibold text-base tabular-nums">{followingCount}</span>
              <span className="text-muted-foreground text-xs group-hover:text-primary/70 transition-colors">
                following
              </span>
            </Link>
          </div>

          {/* Bio */}
          {editing ? (
            <textarea
              value={editAbout}
              onChange={(e) => setEditAbout(e.target.value)}
              placeholder="Tell us about yourself"
              disabled={committing}
              rows={3}
              className="mt-3 flex w-full rounded-lg border border-border/40 bg-transparent px-3 py-2 text-sm font-sans placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          ) : about ? (
            <p className="mt-3 text-sm text-foreground/80 leading-relaxed max-w-prose">{about}</p>
          ) : null}

          {/* Tags */}
          {editing ? (
            <div className="mt-3">
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="tags (comma-separated)"
                disabled={committing}
                className="font-mono bg-transparent border-border/40 text-xs"
              />
              {parseTags(editTags).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {parseTags(editTags).map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-mono text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ) : tags.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            </div>
          ) : null}

          {empty && !editing && (
            <div className="mt-4 pt-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                This account hasn&apos;t set up a profile yet.
              </p>
              {isOwn && (
                <Button
                  variant="link"
                  size="sm"
                  className="font-mono text-primary p-0 h-auto mt-1"
                  onClick={enterEditMode}
                >
                  set up your profile &rarr;
                </Button>
              )}
            </div>
          )}

          {/* Bottom padding */}
          <div className="h-5 sm:h-6" />
        </div>
      </div>

      {/* Own profile: follow input + following/followers tabs */}
      {isOwn && !editing && (
        <div className="space-y-4">
          <TransactionAlert transaction={lastTx} onDismiss={() => setLastTx(null)} />

          {/* Follow input card */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm">
            <label
              htmlFor="follow-input"
              className="text-xs font-medium text-muted-foreground mb-2.5 block font-mono uppercase tracking-wider"
            >
              follow account
            </label>
            <div className="flex gap-2">
              <Input
                id="follow-input"
                placeholder="alice.near"
                value={pendingAccount}
                onChange={(e) => {
                  setPendingAccount(e.target.value);
                  setValidationError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFollow(pendingAccount);
                }}
                disabled={transacting}
                className={`font-mono bg-secondary/30 border-border/40 rounded-lg h-10 ${validationError ? "border-destructive/60 focus:border-destructive" : "focus:border-primary/40"}`}
              />
              <Button
                onClick={() => handleFollow(pendingAccount)}
                disabled={transacting || !pendingAccount}
                className="font-mono rounded-lg h-10 px-5 shrink-0"
              >
                {transacting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  "follow_"
                )}
              </Button>
            </div>
            {validationError && (
              <p className="text-xs text-destructive mt-2 font-mono">{validationError}</p>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="following">
            <TabsList className="bg-secondary/30 border border-border/40 rounded-xl p-1 h-auto">
              <TabsTrigger
                value="following"
                className="font-mono text-xs rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                following ({followingList.length})
              </TabsTrigger>
              <TabsTrigger
                value="followers"
                className="font-mono text-xs rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                followers ({followersList.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="following" className="mt-3">
              <AccountList
                accounts={followingList}
                onUnfollow={handleUnfollow}
                disabled={transacting}
                type="following"
                loading={socialLoading}
              />
            </TabsContent>
            <TabsContent value="followers" className="mt-3">
              <AccountList
                accounts={followersList}
                disabled={transacting}
                type="followers"
                loading={socialLoading}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
