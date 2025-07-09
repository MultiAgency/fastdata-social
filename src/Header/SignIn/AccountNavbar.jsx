import { SignInNavbar } from "./SignInNavbar.jsx";
import { SignedInNavbar } from "./SignedInNavbar.jsx";
import { useWalletSelector } from "@near-wallet-selector/react-hook";

export function AccountNavbar(props) {
  const { signedAccountId: accountId } = useWalletSelector();

  return accountId ? (
    <SignedInNavbar accountId={accountId} props={{ ...props }} />
  ) : (
    <SignInNavbar props={{ ...props }} />
  );
}
