import { useState } from "react";

interface ProfileHeaderProps {
  accountId: string;
  name?: string;
  imageUrl?: string;
  size?: "sm" | "lg";
}

export function ProfileHeader({ accountId, name, imageUrl, size = "lg" }: ProfileHeaderProps) {
  const [imgError, setImgError] = useState(false);

  const avatarSize = size === "lg" ? "w-24 h-24" : "w-10 h-10";
  const avatarRound = size === "lg" ? "rounded-2xl" : "rounded-xl";
  const avatarBorder =
    size === "lg" ? "border-4 border-background shadow-lg" : "border-2 border-background";
  const textSize = size === "lg" ? "text-3xl" : "text-base";
  const nameSize = size === "lg" ? "text-2xl" : "text-sm";

  return (
    <div className="flex items-center gap-3">
      {imageUrl && !imgError ? (
        <img
          src={imageUrl}
          alt={name ?? accountId}
          className={`${avatarSize} ${avatarRound} object-cover ${avatarBorder}`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`${avatarSize} ${avatarRound} bg-primary/10 ${avatarBorder} flex items-center justify-center text-primary ${textSize} font-semibold`}
        >
          {(name ?? accountId).charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {name && (
          <p className={`${nameSize} font-semibold tracking-tight leading-tight truncate`}>
            {name}
          </p>
        )}
        <p className="text-xs text-muted-foreground font-mono truncate">{accountId}</p>
      </div>
    </div>
  );
}
