import './scss/app.scss';
import React, { Component } from "react";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

import balance from "./components/balance";
import orders from "./components/orders";


function App() {
  return (
    <Router>
        <div className="App">
          <Link to="/orders" className="navbar-brand">Orders</Link>
          <Route path="/" exact component={balance} />
          <Route path="/orders" component={orders} />
        </div>
    </Router>
  );
}

export default App;
