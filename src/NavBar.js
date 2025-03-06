import React, { useState, useEffect, useCallback } from 'react';
import './NavBar.css';

const NavBar = ({ near, defaultContractId = 'fastnear.testnet' }) => {
  const [signedIn, setSignedIn] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Data for signed-in users
  const [accountId, setAccountId] = useState('');
  const [contractId, setContractId] = useState(defaultContractId);
  const [contract, setContract] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [initialLetter, setInitialLetter] = useState('?');
  const [hexPayload, setHexPayload] = useState('');

  // Configure once
  // @todo: there's an issue in destructuring or something. the word testnet seems spread
  useEffect(() => {
    near.config({ networkId: 'testnet' });
  }, []);

  // Update the UI state based on NEAR
  const updateUI = useCallback(async () => {
    if (!near) return;

    // If signed in
    if (near.authStatus() === 'SignedIn') {
      setSignedIn(true);

      const contractSelected = near.selected().contract;
      const fullPublicKey = near.selected().publicKey;
      const [curveType, payload] = fullPublicKey.split(':') || [];
      setInitialLetter(curveType ? curveType[0].toUpperCase() : '?');
      setHexPayload(payload || '');
      setAccountId(near.accountId());
      setContract(contractSelected);
      setExpanded(false);
    } else {
      // Not signed in
      setSignedIn(false);
      setExpanded(true);
    }
  }, [near]);

  // Copy text handler
  const handleCopy = async (value, e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      // (Optional) show a flash / outline effect in a real app
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Toggle expansion
  const toggleExpanded = (e) => {
    const allowedContainerClick =
      e.target.id === 'auth' ||
      e.target.classList.contains('account-name') ||
      e.target.id === 'auth-logged-in' ||
      e.target.id === 'auth-logged-out';
    if (allowedContainerClick) {
      setExpanded(!expanded);
    }
  };

  // Sign in / sign out
  const handleSignIn = (e) => {
    e.stopPropagation();
    // if (!near) return;
    near.requestSignIn({ contractId });
  };

  const handleSignOut = (e) => {
    e.stopPropagation();
    if (!near) return;
    near.signOut();
    window.location.reload();
  };

  // Effects
  useEffect(() => {
    if (!near) return;
    near.event.onAccount((acctId) => {
      if (acctId) {
        console.log('fastnear: account update:', acctId);
      }
      updateUI();
    });
    updateUI();
  }, [near, updateUI]);

  return (
    <div id="navbar">
      <div
        id="auth"
        className={`user-info pointer ${expanded ? 'expanded' : 'collapsed'}`}
        onClick={toggleExpanded}
      >
        {signedIn ? (
          <div
            id="auth-logged-in"
            className="flex flex-column items-center w-100"
          >
            <div
              className="account-name truncate w-100 tc white-90 stop-prop"
              onClick={(e) => e.stopPropagation()}
            >
              {accountId}
            </div>
            {!expanded ? null : (
              <div className="expanded-content w-100">
                <div
                  className="near-contract copyable pa1 ma2 lightest-blue tc pb0 mb1"
                  onClick={(e) => handleCopy(contract, e)}
                >
                  {contract}
                </div>
                <div
                  className="near-public-key copyable pa1 ma2 pt0 lightest-blue tc flex items-center"
                  onClick={(e) => handleCopy(publicKey, e)}
                >
                  <div className="public-key-square-initial bg-light-green dark-gray w1 h1 flex items-center justify-center f5 fw6 mr2">
                    {initialLetter}
                  </div>
                  <div className="public-key-truncated white-80 truncate w-100 tc f7 code">
                    {hexPayload.slice(0, 8)}…{hexPayload.slice(-8)}
                  </div>
                </div>
                <button
                  id="sign-out"
                  className="mt3 ba pointer signout-button"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div id="auth-logged-out" className="pa1" style={{ minWidth: '220px' }}>
            <div className="flex flex-column">
              <label className="f5 white-80 mb3">near contract:</label>
              <input
                type="text"
                id="contractId"
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                className="input-reset ba b--white-30 pa2 mb2 w5 br2 bg-black-30 white"
              />
              <button
                id="sign-in"
                className="bn br2 pv2 ph3 pointer mt2"
                style={{ background: 'var(--accent)' }}
                onClick={handleSignIn}
              >
                create session key
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavBar;
