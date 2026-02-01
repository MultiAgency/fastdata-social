import { useWallet } from "../../providers/WalletProvider";

export function SignedInNavbar() {
  const { accountId, disconnectWallet } = useWallet();
  return (
    <>
      <li className="nav-item">
        <div
          className="me-2 text-truncate d-inline-block align-middle"
          style={{ maxWidth: "15em" }}
        >
          {accountId}
        </div>
        <button className="btn btn-secondary" onClick={disconnectWallet}>
          Sign Out
        </button>
      </li>
    </>
  );
}
