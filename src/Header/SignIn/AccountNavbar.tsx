import { SignInNavbar } from "./SignInNavbar";
import { SignedInNavbar } from "./SignedInNavbar";
import { useWallet } from "../../providers/WalletProvider";

export function AccountNavbar() {
  const { isConnected } = useWallet();

  return isConnected ? <SignedInNavbar /> : <SignInNavbar />;
}
