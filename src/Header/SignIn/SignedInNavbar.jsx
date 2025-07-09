import { useWalletSelector } from "@near-wallet-selector/react-hook";

export function SignedInNavbar(props) {
  const { signedAccountId: accountId, signOut } = useWalletSelector();
  return (
    <>
      <li className="nav-item">
        <div
          className="me-2 text-truncate d-inline-block align-middle"
          style={{ maxWidth: "15em" }}
        >
          {accountId}
        </div>
        <button className="btn btn-secondary" onClick={() => signOut()}>
          Sign Out
        </button>
      </li>
    </>
  );
}
