import { useNear } from "@near-kit/react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Constants } from "../hooks/constants";
import { useClient } from "../hooks/useClient";
import { useWallet } from "../providers/WalletProvider";
import { getTxExplorerUrl } from "../utils/validation";

function buildKvArgs(fields: {
  name: string;
  imageUrl: string;
  about: string;
  tags: string;
  twitter: string;
  github: string;
  website: string;
}): Record<string, string> {
  const args: Record<string, string> = {};
  if (fields.name) args["profile/name"] = fields.name;
  if (fields.about) args["profile/about"] = fields.about;
  if (fields.imageUrl) args["profile/image/url"] = fields.imageUrl;
  for (const raw of fields.tags.split(",")) {
    const tag = raw.trim();
    if (tag) args[`profile/tags/${tag}`] = "";
  }
  if (fields.twitter) args["profile/linktree/twitter"] = fields.twitter;
  if (fields.github) args["profile/linktree/github"] = fields.github;
  if (fields.website) args["profile/linktree/website"] = fields.website;
  return args;
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function ProfileEditor() {
  const { accountId } = useWallet();
  const near = useNear();
  const client = useClient();

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [about, setAbout] = useState("");
  const [tags, setTags] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
  const [website, setWebsite] = useState("");

  const [loading, setLoading] = useState(true);
  const [transacting, setTransacting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [imgPreviewError, setImgPreviewError] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    client
      .getProfile(accountId)
      .then((p) => {
        if (cancelled || !p || Object.keys(p).length === 0) {
          setLoading(false);
          return;
        }
        setName(p.name ?? "");
        setImageUrl(p.image?.url ?? "");
        setAbout(p.about ?? p.description ?? "");
        setTags(p.tags ? Object.keys(p.tags).join(", ") : "");
        setTwitter(p.linktree?.twitter ?? "");
        setGithub(p.linktree?.github ?? "");
        setWebsite(p.linktree?.website ?? "");
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, client]);

  const kvArgs = buildKvArgs({ name, imageUrl, about, tags, twitter, github, website });

  const handleCommit = useCallback(async () => {
    if (!near || !accountId) return;
    setTransacting(true);
    setError(null);
    setTxHash(null);

    try {
      const result = await near
        .transaction(accountId)
        .functionCall(Constants.KV_CONTRACT_ID, "__fastdata_kv", kvArgs, { gas: "10 Tgas" })
        .send()
        .catch(() => undefined);

      const hash = result?.transaction?.hash as string | undefined;
      if (hash) {
        setTxHash(hash);
      } else {
        setError("Transaction was not confirmed");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setError(message);
    } finally {
      setTransacting(false);
    }
  }, [near, accountId, kvArgs]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const tagList = parseTags(tags);

  return (
    <div className="animate-fade-up">
      {txHash && (
        <Alert variant="default" className="mb-6 border-l-2 border-l-primary bg-primary/5">
          <AlertDescription>
            <span className="font-semibold text-primary">Profile updated</span>
            <span className="text-sm text-muted-foreground font-mono ml-2">indexing (~2-3s)</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <a
              href={getTxExplorerUrl(txHash, Constants.EXPLORER_URL)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-primary hover:underline"
            >
              view tx →
            </a>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setTxHash(null)}
            aria-label="Close"
          >
            ×
          </Button>
        </Alert>
      )}

      {error && (
        <Alert variant="default" className="mb-6 border-l-2 border-l-accent bg-accent/5">
          <AlertDescription>
            <span className="font-semibold text-destructive">{error}</span>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setError(null)}
            aria-label="Close"
          >
            ×
          </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Live preview */}
        <div className="lg:col-span-2 order-first">
          <div className="lg:sticky lg:top-24">
            <p className="text-xs text-muted-foreground font-mono mb-3">preview_</p>
            <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
              <div className="h-20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
              <div className="px-5 pb-5">
                <div className="-mt-10 mb-3">
                  {imageUrl && !imgPreviewError ? (
                    <img
                      src={imageUrl}
                      alt="avatar"
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-background shadow-lg"
                      onError={() => setImgPreviewError(true)}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center text-primary text-2xl font-semibold">
                      {(name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {name ? (
                  <h2 className="text-lg font-semibold tracking-tight leading-tight">{name}</h2>
                ) : (
                  <div className="h-5 w-28 rounded bg-muted/50" />
                )}
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                  {accountId}
                </p>
                {about ? (
                  <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{about}</p>
                ) : (
                  <div className="mt-3 space-y-1.5">
                    <div className="h-3 w-full rounded bg-muted/30" />
                    <div className="h-3 w-2/3 rounded bg-muted/30" />
                  </div>
                )}
                {tagList.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tagList.map((tag) => (
                      <Badge key={tag} variant="secondary" className="font-mono text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {(twitter || github || website) && (
                  <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-3">
                    {twitter && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        <span className="font-mono">{twitter}</span>
                      </span>
                    )}
                    {github && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                        <span className="font-mono">{github}</span>
                      </span>
                    )}
                    {website && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                        <svg
                          className="w-3 h-3"
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
                        <span className="font-mono">{website.replace(/^https?:\/\//, "")}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <p className="text-xs text-muted-foreground font-mono mb-3">edit_</p>
          <div className="rounded-xl border border-border bg-card/50 p-5 space-y-5">
            <div>
              <label
                htmlFor="profile-name"
                className="text-sm font-medium text-muted-foreground mb-2 block font-mono"
              >
                name_
              </label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alice"
                disabled={transacting}
                className="font-mono bg-secondary/50"
              />
            </div>

            <div>
              <label
                htmlFor="profile-image"
                className="text-sm font-medium text-muted-foreground mb-2 block font-mono"
              >
                image_
              </label>
              <Input
                id="profile-image"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImgPreviewError(false);
                }}
                placeholder="https://..."
                disabled={transacting}
                className="font-mono bg-secondary/50"
              />
            </div>

            <div>
              <label
                htmlFor="profile-about"
                className="text-sm font-medium text-muted-foreground mb-2 block font-mono"
              >
                about_
              </label>
              <textarea
                id="profile-about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Tell us about yourself"
                disabled={transacting}
                rows={3}
                className="flex w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="profile-tags"
                className="text-sm font-medium text-muted-foreground mb-2 block font-mono"
              >
                tags_
              </label>
              <Input
                id="profile-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="build, learn, create"
                disabled={transacting}
                className="font-mono bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground mt-1 font-mono">comma-separated</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="profile-twitter"
                  className="text-sm font-medium text-muted-foreground mb-2 block font-mono"
                >
                  twitter_
                </label>
                <Input
                  id="profile-twitter"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="handle"
                  disabled={transacting}
                  className="font-mono bg-secondary/50"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-github"
                  className="text-sm font-medium text-muted-foreground mb-2 block font-mono"
                >
                  github_
                </label>
                <Input
                  id="profile-github"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="handle"
                  disabled={transacting}
                  className="font-mono bg-secondary/50"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-website"
                  className="text-sm font-medium text-muted-foreground mb-2 block font-mono"
                >
                  website_
                </label>
                <Input
                  id="profile-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  disabled={transacting}
                  className="font-mono bg-secondary/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleCommit}
                disabled={transacting || Object.keys(kvArgs).length === 0}
                className="glow-primary font-mono"
              >
                {transacting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ...
                  </span>
                ) : (
                  "commit_"
                )}
              </Button>
              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="text-sm text-muted-foreground hover:text-foreground font-mono transition-colors"
              >
                {showJson ? "hide json_" : "show json_"}
              </button>
            </div>

            {showJson && (
              <pre className="bg-secondary/50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                {JSON.stringify(kvArgs, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
