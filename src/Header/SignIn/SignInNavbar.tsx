import { useWallet } from "../../providers/WalletProvider";
import { Button } from "@/components/ui/button";

export function SignInNavbar() {
  const { connectWallet } = useWallet();
  return (
    <Button onClick={connectWallet} className="glow-primary font-mono text-sm">
      connect_
    </Button>
  );
}
