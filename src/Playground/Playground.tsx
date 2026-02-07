import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionItem } from "../client";
import {
  buildCommentArgs,
  buildFollowArgs,
  buildLikeArgs,
  buildPostArgs,
  buildProfileArgs,
  buildRepostArgs,
  buildUnfollowArgs,
  extractHashtags,
  extractMentions,
} from "../client";
import { Constants } from "../hooks/constants";
import { useWallet } from "../providers/WalletProvider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaygroundProps {
  accountId: string;
}

interface TxLogEntry {
  id: string;
  timestamp: Date;
  label: string;
  keyCount: number;
  txId: string | null;
  wasError: boolean;
}

interface KvPair {
  id: string;
  key: string;
  value: string;
}

type SocialAction = "like" | "comment" | "repost";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseKvValue(raw: string): unknown {
  if (raw === "null") return null;
  if (raw === '""' || raw === "") return "";
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function JsonPreview({ args }: { args: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
      >
        {open ? "hide json" : "preview json"}
      </button>
      {open && (
        <pre className="bg-secondary rounded-lg p-3 font-mono text-xs overflow-auto max-h-48 mt-2">
          {JSON.stringify(args, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  );
}

function CardHeader({ title, endpoints }: { title: string; endpoints: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-medium text-muted-foreground font-mono">{title}</span>
      <span className="hidden sm:inline text-xs text-muted-foreground font-mono">{endpoints}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function Playground({ accountId }: PlaygroundProps) {
  const { near } = useWallet();

  // Shared state
  const targetContract = Constants.KV_CONTRACT_ID;
  const [transacting, setTransacting] = useState(false);
  const [activeLabel, setActiveLabel] = useState("");
  const [txLog, setTxLog] = useState<TxLogEntry[]>([]);

  // Section 1: Profile
  const [profileName, setProfileName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profileAbout, setProfileAbout] = useState("");
  const [profileTags, setProfileTags] = useState("");
  const [profileTwitter, setProfileTwitter] = useState("");
  const [profileGithub, setProfileGithub] = useState("");
  const [profileWebsite, setProfileWebsite] = useState("");

  // Section 2: Post
  const [postContent, setPostContent] = useState("");

  // Section 3: Social Action
  const [actionType, setActionType] = useState<SocialAction>("like");
  const [actionAuthor, setActionAuthor] = useState("");
  const [actionBlockHeight, setActionBlockHeight] = useState("");
  const [actionComment, setActionComment] = useState("");

  // Section 4: Follow
  const [followTarget, setFollowTarget] = useState("");

  // Section 5: Custom KV
  const [kvPairs, setKvPairs] = useState<KvPair[]>([{ id: "1", key: "", value: "" }]);

  // -------------------------------------------------------------------------
  // commitKv
  // -------------------------------------------------------------------------

  // biome-ignore lint/correctness/useExhaustiveDependencies: near reference is stable from useWallet()
  const commitKv = useCallback(
    async (args: Record<string, unknown>, label: string) => {
      if (!near) return;
      setTransacting(true);
      setActiveLabel(label);

      let txId: string | null = null;
      let wasError = false;

      try {
        const result = await near.call(targetContract, "__fastdata_kv", args, {
          gas: "10 Tgas",
        });
        txId = (result?.transaction?.hash as string) || null;
      } catch (err) {
        // biome-ignore lint/suspicious/noConsole: error logging in catch handler
        console.error(`commitKv "${label}" failed:`, err);
        wasError = true;
      }

      setTxLog((prev) =>
        [
          {
            id: Date.now().toString(),
            timestamp: new Date(),
            label,
            keyCount: Object.keys(args).length,
            txId,
            wasError,
          },
          ...prev,
        ].slice(0, 20),
      );

      setTransacting(false);
      setActiveLabel("");
    },
    [near, targetContract],
  );

  // -------------------------------------------------------------------------
  // Build args objects (memoized for live preview)
  // -------------------------------------------------------------------------

  const profileArgs = useMemo(() => {
    const tags = profileTags
      ? profileTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;
    const linktree: Record<string, string> = {};
    if (profileTwitter) linktree.twitter = profileTwitter;
    if (profileGithub) linktree.github = profileGithub;
    if (profileWebsite) linktree.website = profileWebsite;
    return buildProfileArgs(accountId, {
      name: profileName || undefined,
      image_url: profileImage || undefined,
      about: profileAbout || undefined,
      tags,
      linktree: Object.keys(linktree).length > 0 ? linktree : undefined,
    });
  }, [
    accountId,
    profileName,
    profileImage,
    profileAbout,
    profileTags,
    profileTwitter,
    profileGithub,
    profileWebsite,
  ]);

  const postArgs = useMemo(() => {
    if (!postContent) return {};
    return buildPostArgs(accountId, { text: postContent });
  }, [accountId, postContent]);

  const actionArgs = useMemo(() => {
    if (!actionAuthor || !actionBlockHeight) return {};
    const item: ActionItem = {
      type: actionType,
      path: `${actionAuthor}/post/main`,
      blockHeight: actionBlockHeight,
    };

    if (actionType === "like") {
      return buildLikeArgs(accountId, item);
    } else if (actionType === "comment") {
      if (actionComment) {
        return buildCommentArgs(accountId, {
          text: actionComment,
          targetAuthor: actionAuthor,
          targetBlockHeight: actionBlockHeight,
        });
      }
      return {};
    } else if (actionType === "repost") {
      return buildRepostArgs(accountId, item);
    }

    return {};
  }, [accountId, actionType, actionAuthor, actionBlockHeight, actionComment]);

  const followArgs = useMemo(() => {
    if (!followTarget) return {};
    return buildFollowArgs(accountId, followTarget);
  }, [accountId, followTarget]);

  const unfollowArgs = useMemo(() => {
    if (!followTarget) return {};
    return buildUnfollowArgs(accountId, followTarget);
  }, [accountId, followTarget]);

  const customKvArgs = useMemo(() => {
    const a: Record<string, unknown> = {};
    kvPairs.forEach((p) => {
      if (p.key) a[p.key] = parseKvValue(p.value);
    });
    return a;
  }, [kvPairs]);

  // -------------------------------------------------------------------------
  // KV pair helpers
  // -------------------------------------------------------------------------

  function addKvPair() {
    setKvPairs((prev) => [...prev, { id: Date.now().toString(), key: "", value: "" }]);
  }

  function removeKvPair(id: string) {
    setKvPairs((prev) => prev.filter((p) => p.id !== id));
  }

  function updateKvPair(id: string, field: "key" | "value", val: string) {
    setKvPairs((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isActive = (label: string) => transacting && activeLabel === label;

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Playground</h1>
        <p className="text-sm text-muted-foreground font-mono">
          store key-value data on NEAR using FastData
        </p>
      </div>

      {/* Contract / Sender config */}
      <div className="mb-6 p-5 rounded-xl border border-border bg-card/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="pg-contract"
              className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono"
            >
              contract
            </label>
            <Input
              id="pg-contract"
              value={targetContract}
              readOnly
              className="font-mono bg-secondary/50 opacity-60"
            />
          </div>
          <div>
            <label
              htmlFor="pg-sender"
              className="text-xs font-medium text-muted-foreground mb-1.5 block font-mono"
            >
              sender
            </label>
            <Input
              id="pg-sender"
              value={accountId}
              readOnly
              className="font-mono bg-secondary/50 opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Transaction Log */}
      {txLog.length > 0 && (
        <div className="mb-6 space-y-1.5">
          {txLog.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs font-mono ${
                entry.wasError
                  ? "border-l-2 border-l-accent border-border bg-accent/5"
                  : "border-l-2 border-l-primary border-border bg-primary/5"
              }`}
            >
              <span className="text-muted-foreground">{entry.timestamp.toLocaleTimeString()}</span>
              <span>{entry.label}</span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {entry.keyCount} key{entry.keyCount !== 1 ? "s" : ""}
              </Badge>
              {entry.txId ? (
                <a
                  href={`${Constants.EXPLORER_URL}/${entry.txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-auto truncate max-w-[120px]"
                >
                  {entry.txId.slice(0, 8)}...
                </a>
              ) : (
                <span className="text-muted-foreground ml-auto">
                  {entry.wasError ? "failed" : "no hash"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Section 1: Profile */}
      <div className="mb-4 p-5 rounded-xl border border-border bg-card/50">
        <CardHeader title="profile" endpoints="/social/profile, /social/get, /kv/query" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="pg-profile-name"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              display name
            </label>
            <Input
              id="pg-profile-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Alice"
              disabled={transacting}
              className="font-mono bg-secondary/50"
            />
          </div>
          <div>
            <label
              htmlFor="pg-profile-image"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              image url
            </label>
            <Input
              id="pg-profile-image"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              placeholder="https://..."
              disabled={transacting}
              className="font-mono bg-secondary/50"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="pg-profile-about"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              about
            </label>
            <textarea
              id="pg-profile-about"
              value={profileAbout}
              onChange={(e) => setProfileAbout(e.target.value)}
              placeholder="Hello world"
              disabled={transacting}
              rows={2}
              className="flex w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>
          <div>
            <label
              htmlFor="pg-profile-tags"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              tags (comma separated)
            </label>
            <Input
              id="pg-profile-tags"
              value={profileTags}
              onChange={(e) => setProfileTags(e.target.value)}
              placeholder="developer, near"
              disabled={transacting}
              className="font-mono bg-secondary/50"
            />
          </div>
          <div>
            <label
              htmlFor="pg-profile-twitter"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              twitter
            </label>
            <Input
              id="pg-profile-twitter"
              value={profileTwitter}
              onChange={(e) => setProfileTwitter(e.target.value)}
              placeholder="alice"
              disabled={transacting}
              className="font-mono bg-secondary/50"
            />
          </div>
          <div>
            <label
              htmlFor="pg-profile-github"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              github
            </label>
            <Input
              id="pg-profile-github"
              value={profileGithub}
              onChange={(e) => setProfileGithub(e.target.value)}
              placeholder="alice"
              disabled={transacting}
              className="font-mono bg-secondary/50"
            />
          </div>
          <div>
            <label
              htmlFor="pg-profile-website"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              website
            </label>
            <Input
              id="pg-profile-website"
              value={profileWebsite}
              onChange={(e) => setProfileWebsite(e.target.value)}
              placeholder="https://alice.dev"
              disabled={transacting}
              className="font-mono bg-secondary/50"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={() => commitKv(profileArgs, "profile")}
            disabled={transacting || Object.keys(profileArgs).length === 0}
            className="glow-primary font-mono"
          >
            {isActive("profile") ? (
              <span className="flex items-center gap-2">
                <Spinner /> ...
              </span>
            ) : (
              "commit"
            )}
          </Button>
        </div>
        <JsonPreview args={profileArgs} />
      </div>

      {/* Section 2: Create Post */}
      <div className="mb-4 p-5 rounded-xl border border-border bg-card/50">
        <CardHeader title="post" endpoints="/social/feed/account, /social/index" />
        <label
          htmlFor="pg-post-content"
          className="text-xs text-muted-foreground mb-1 block font-mono"
        >
          content (markdown, use #hashtags and @mentions.near)
        </label>
        <textarea
          id="pg-post-content"
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder="Hello #near @bob.near"
          disabled={transacting}
          rows={4}
          className="flex w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={() => commitKv(postArgs, "post")}
            disabled={transacting || !postContent}
            className="glow-primary font-mono"
          >
            {isActive("post") ? (
              <span className="flex items-center gap-2">
                <Spinner /> ...
              </span>
            ) : (
              "commit"
            )}
          </Button>
          {extractHashtags(postContent).length > 0 && (
            <span className="text-xs text-muted-foreground font-mono">
              {extractHashtags(postContent)
                .map((h) => `#${h}`)
                .join(" ")}
            </span>
          )}
          {extractMentions(postContent).length > 0 && (
            <span className="text-xs text-muted-foreground font-mono">
              {extractMentions(postContent)
                .map((m) => `@${m}`)
                .join(" ")}
            </span>
          )}
        </div>
        <JsonPreview args={postArgs} />
      </div>

      {/* Section 3: Social Action */}
      <div className="mb-4 p-5 rounded-xl border border-border bg-card/50">
        <CardHeader title="action" endpoints="/social/index" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="pg-action-type"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              type
            </label>
            <select
              id="pg-action-type"
              value={actionType}
              onChange={(e) => setActionType(e.target.value as SocialAction)}
              disabled={transacting}
              className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="like">like</option>
              <option value="comment">comment</option>
              <option value="repost">repost</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="pg-action-author"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              post author
            </label>
            <Input
              id="pg-action-author"
              value={actionAuthor}
              onChange={(e) => setActionAuthor(e.target.value)}
              placeholder="alice.near"
              disabled={transacting}
              className="font-mono bg-secondary/50"
            />
          </div>
          <div>
            <label
              htmlFor="pg-action-block-height"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              block height
            </label>
            <Input
              id="pg-action-block-height"
              value={actionBlockHeight}
              onChange={(e) => setActionBlockHeight(e.target.value)}
              placeholder="123456789"
              disabled={transacting}
              className="font-mono bg-secondary/50"
            />
          </div>
        </div>
        {actionType === "comment" && (
          <div className="mt-3">
            <label
              htmlFor="pg-action-comment"
              className="text-xs text-muted-foreground mb-1 block font-mono"
            >
              comment
            </label>
            <textarea
              id="pg-action-comment"
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              placeholder="Nice post!"
              disabled={transacting}
              rows={2}
              className="flex w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>
        )}
        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={() => commitKv(actionArgs, actionType)}
            disabled={transacting || !actionAuthor || !actionBlockHeight}
            className="glow-primary font-mono"
          >
            {isActive(actionType) ? (
              <span className="flex items-center gap-2">
                <Spinner /> ...
              </span>
            ) : (
              "commit"
            )}
          </Button>
        </div>
        <JsonPreview args={actionArgs} />
      </div>

      {/* Section 4: Follow / Unfollow */}
      <div className="mb-4 p-5 rounded-xl border border-border bg-card/50">
        <CardHeader title="follow" endpoints="/social/followers, /social/following, /kv/reverse" />
        <label
          htmlFor="pg-follow-target"
          className="text-xs text-muted-foreground mb-1 block font-mono"
        >
          target account
        </label>
        <Input
          id="pg-follow-target"
          value={followTarget}
          onChange={(e) => setFollowTarget(e.target.value)}
          placeholder="alice.near"
          disabled={transacting}
          className="font-mono bg-secondary/50"
        />
        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={() => commitKv(followArgs, "follow")}
            disabled={transacting || !followTarget}
            className="glow-primary font-mono"
          >
            {isActive("follow") ? (
              <span className="flex items-center gap-2">
                <Spinner /> ...
              </span>
            ) : (
              "follow"
            )}
          </Button>
          <Button
            onClick={() => commitKv(unfollowArgs, "unfollow")}
            disabled={transacting || !followTarget}
            variant="outline"
            className="font-mono"
          >
            {isActive("unfollow") ? (
              <span className="flex items-center gap-2">
                <Spinner /> ...
              </span>
            ) : (
              "unfollow"
            )}
          </Button>
        </div>
        <JsonPreview args={followTarget ? followArgs : {}} />
      </div>

      {/* Section 5: Custom KV */}
      <div className="mb-4 p-5 rounded-xl border border-border bg-card/50">
        <CardHeader title="custom kv" endpoints="/kv/get, /kv/query, /kv/history, /kv/batch" />
        <div className="space-y-2">
          {kvPairs.map((pair) => (
            <div key={pair.id} className="flex items-center gap-2">
              <Input
                value={pair.key}
                onChange={(e) => updateKvPair(pair.id, "key", e.target.value)}
                placeholder="key"
                disabled={transacting}
                className="font-mono bg-secondary/50 flex-1"
              />
              <Input
                value={pair.value}
                onChange={(e) => updateKvPair(pair.id, "value", e.target.value)}
                placeholder="value"
                disabled={transacting}
                className="font-mono bg-secondary/50 flex-1"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeKvPair(pair.id)}
                disabled={transacting || kvPairs.length === 1}
                className="text-muted-foreground hover:text-destructive"
              >
                x
              </Button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addKvPair}
          disabled={transacting}
          className="text-xs text-muted-foreground hover:text-foreground font-mono mt-2 transition-colors"
        >
          + add row
        </button>
        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={() => commitKv(customKvArgs, "custom kv")}
            disabled={transacting || Object.keys(customKvArgs).length === 0}
            className="glow-primary font-mono"
          >
            {isActive("custom kv") ? (
              <span className="flex items-center gap-2">
                <Spinner /> ...
              </span>
            ) : (
              "commit"
            )}
          </Button>
        </div>
        <JsonPreview args={customKvArgs} />
      </div>

      {/* Section 6: Reference Table */}
      <div className="mb-4 p-5 rounded-xl border border-border bg-card/50">
        <CardHeader title="reference" endpoints="" />
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium">section</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium">
                  endpoints populated
                </th>
              </tr>
            </thead>
            <tbody className="text-xs">
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">profile</td>
                <td className="py-2 text-muted-foreground">
                  /social/profile, /social/get, /kv/query
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">post</td>
                <td className="py-2 text-muted-foreground">/social/feed/account, /social/index</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">action</td>
                <td className="py-2 text-muted-foreground">/social/index</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">follow</td>
                <td className="py-2 text-muted-foreground">
                  /social/followers, /social/following, /kv/reverse
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">custom kv</td>
                <td className="py-2 text-muted-foreground">
                  /kv/get, /kv/query, /kv/history, /kv/batch
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
