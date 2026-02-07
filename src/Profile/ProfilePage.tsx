import { useParams } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWallet } from "../providers/WalletProvider";
import { ProfileView } from "./ProfileView";

export function ProfilePage() {
  const { accountId: paramAccountId } = useParams({ strict: false }) as { accountId?: string };
  const { accountId: signedInAccount } = useWallet();

  const targetAccount = paramAccountId ?? signedInAccount;

  if (!targetAccount) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fade-up">
        <Alert variant="default" className="max-w-sm border-primary/30 bg-primary/5">
          <AlertDescription className="text-center">
            Click <span className="font-semibold text-primary">Sign In</span> above to view your
            profile
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <ProfileView accountId={targetAccount} />;
}
