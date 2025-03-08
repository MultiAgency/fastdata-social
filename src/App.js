import React, { useEffect, useState } from 'react';
import FileUploader from './FileUploader.js';
import NavBar from './NavBar.js';
import FastNearAuth from './FastNearAuth.js';
import './styles/basic-responsive.css';
import './styles/custom.css';
import './styles/components/CoolButtons.css';
import * as near from '@fastnear/api'

const App = () => {  
  const [accountId, setAccountId] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  // Using testnet contract ID
  const contractId = "fastnear.testnet";

  // Configure NEAR on component mount
  useEffect(() => {
    // IMPORTANT: Explicitly configure to use testnet
    near.config({ 
      networkId: "testnet",
      // Adding explicit testnet node URL for clarity
      nodeUrl: "https://rpc.testnet.near.org"
    });

    // Set up account change listener
    near.event.onAccount(() => {
      checkSignIn();
    });

    // Initial check
    checkSignIn();
  }, []);

  // Check if user is signed in
  const checkSignIn = () => {
    if (near.authStatus() === "SignedIn") {
      setIsSignedIn(true);
      setAccountId(near.accountId());
      setPublicKey(near.selected().publicKey);
    } else {
      setIsSignedIn(false);
      setAccountId("");
      setPublicKey("");
    }
  };

  return (
    <div className="app">
      {/* Auth component stays outside the flow for proper z-index */}
      <FastNearAuth 
        near={near} 
        contractId={contractId}
        accountId={accountId}
        publicKey={publicKey}
        isSignedIn={isSignedIn}
      />
      
      <header className="nav-container">
        <div className="nav-content">
          <NavBar />
        </div>
      </header>
      
      <main className="main-container">
        <FileUploader
          contractId={contractId}
          accountId={accountId}
          isSignedIn={isSignedIn}
        />
      </main>
    </div>
  );
};

export default App;
