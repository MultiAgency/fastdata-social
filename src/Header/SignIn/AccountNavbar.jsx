import { useAccountId } from "../../hooks/useAccountId.js";
import { SignInNavbar } from "./SignInNavbar.jsx";
import { SignedInNavbar } from "./SignedInNavbar.jsx";

export function AccountNavbar(props) {
  const accountId = useAccountId();

  return accountId ? (
    <SignedInNavbar accountId={accountId} props={{ ...props }} />
  ) : (
    <SignInNavbar props={{ ...props }} />
  );
}
