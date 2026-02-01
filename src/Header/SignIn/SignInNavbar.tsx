import { useWallet } from "../../providers/WalletProvider";

export function SignInNavbar() {
  const { connectWallet } = useWallet();
  return (
    <>
      <li className="nav-item">
        <button className="btn btn-primary" onClick={connectWallet}>
          Sign In
        </button>
      </li>
    </>
  );
}
