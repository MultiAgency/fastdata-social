import { useWallet } from "../../providers/WalletProvider";
import { SignedInNavbar } from "./SignedInNavbar";
import { SignInNavbar } from "./SignInNavbar";

export function AccountNavbar() {
  const { isConnected } = useWallet();

  return isConnected ? <SignedInNavbar /> : <SignInNavbar />;
}
