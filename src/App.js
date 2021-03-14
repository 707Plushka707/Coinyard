import './scss/app.scss';
import '@fortawesome/fontawesome-free/css/all.css';
import React, { Component } from "react";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

import balance from "./components/balance";
import orders from "./components/orders";
import scalping from "./components/scalping";


function App() {
  return (
    <Router>
        <div className="App">
          <div className="menu">
            <div className="menu-logo"><h1>Coinyard</h1></div>
            <div className="menu-items">
              <div className="menu-items-item">
              <i class="fas fa-seedling"></i><Link to="/" className="menu-items-item__link">Home</Link>
              </div>
              <div className="menu-items-item">
              <i class="fas fa-list"></i><Link to="/scalping" className="menu-items-item__link">Scalping</Link>
              </div>
            </div>
          </div>
          <div className="main">
            <Route path="/" exact component={balance} />
            <Route path="/scalping" component={scalping} />
          </div>
        </div>
    </Router>
  );
}

export default App;
