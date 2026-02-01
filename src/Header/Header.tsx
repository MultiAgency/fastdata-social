import { AccountNavbar } from "./SignIn/AccountNavbar";

export function Header() {
  return (
    <nav className="sticky-top navbar navbar-expand-lg bg-body-tertiary">
      <div className="container-fluid">
        <a className="navbar-brand fs-4" href="/">
          FastData
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarText"
          aria-controls="navbarText"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarText">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <a className="nav-link" href="https://fastfs.io" target="_blank" rel="noopener noreferrer">
                Docs
              </a>
            </li>
          </ul>
          <ul className="navbar-nav d-flex">
            <AccountNavbar />
          </ul>
        </div>
      </div>
    </nav>
  );
}
