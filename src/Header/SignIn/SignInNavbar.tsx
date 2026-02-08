import { Button } from "@/components/ui/button";
import { useWallet } from "../../providers/WalletProvider";

export function SignInNavbar() {
  const { connectWallet } = useWallet();
  return (
    <Button
      onClick={connectWallet}
      className="btn-shimmer text-primary-foreground font-mono text-sm h-9 px-5 rounded-lg"
    >
      <svg
        className="w-3.5 h-3.5 mr-1"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
      </svg>
      connect_
    </Button>
  );
}
