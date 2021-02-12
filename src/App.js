import './scss/app.scss';
import React, { Component } from "react";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

import balance from "./components/balance";

import logo from "./logo.svg";


function App() {
  return (
    <Router>
        <div className="App">
          <Route path="/" exact component={balance} />
        </div>
    </Router>
  );
}

export default App;
