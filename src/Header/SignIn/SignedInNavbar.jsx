import { useWalletSelector } from "@near-wallet-selector/react-hook";

export function SignedInNavbar(props) {
  const { signOut } = useWalletSelector();
  return (
    <>
      <li className="nav-item">
        <button className="btn btn-secondary" onClick={() => signOut()}>
          Sign Out
        </button>
      </li>
    </>
  );
}
