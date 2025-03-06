import * as near from '@fastnear/api'
import React from 'react';
import FileUploader from './FileUploader.js';
import './FileUploader.css';
import NavBar from "./NavBar.js";

const App = () => {
  return (
    <div className="app">
      <header>
        <h1>FastData Upload Standalone</h1>
        <NavBar near={near} />
      </header>
      <main>
        <FileUploader />
      </main>
    </div>
  );
};

export default App;
