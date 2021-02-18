import './scss/app.scss';
import React, { Component } from "react";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

import balance from "./components/balance";
import orders from "./components/orders";


function App() {
  return (
    <Router>
        <div className="App">
          <div className="menu">
            <div className="menu-logo"><h1>Coinyard</h1></div>
            <div className="menu-items">
              <div className="menu-items-item">
                <Link to="/" className="menu-items-item__link">Home</Link>
              </div>
              <div className="menu-items-item">
                <Link to="/orders" className="menu-items-item__link">Orders</Link>
              </div>
            </div>
          </div>
          <div className="main">
            <Route path="/" exact component={balance} />
            <Route path="/orders" component={orders} />
          </div>
        </div>
    </Router>
  );
}

export default App;
