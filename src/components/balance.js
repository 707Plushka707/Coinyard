import React, { Component } from 'react';
import map from 'lodash/map';

export default class Balance extends Component {
    render() {
        const { error, balance } = this.state;
        let totalBalance = 0;
        let coins = map(balance, (value, key) => {
            if(balance[key].quantity > 0) {
                totalBalance += balance[key].priceEur * balance[key].quantity
                return (
                    <h3 key={key}>{key} {(balance[key].priceEur * balance[key].quantity).toFixed(2)}</h3>
                )
            }
        })
        
        let btcPrice = map(balance, (value, key) => {
            if(key === 'BTC') {
                return (balance[key].priceEur)
            }
        })

        if (error) {
          return <div>Error: {error.message}</div>;
        } else {
          return (
            <div className="balance">
                {totalBalance}
                <h1>BTC: &euro; {btcPrice}</h1>
                { coins }
            </div>
          );
        }
    }

    constructor(props) {
        super(props);

        this.state = {
            balance: [],
            btcPrice: ''
        }
    }

    componentDidMount() {
        fetch("/balance")
            .then(res => res.json())
            .then(
                (result) => {
                this.setState({
                    balance: result.balance
                });
                },
                // Note: it's important to handle errors here
                // instead of a catch() block so that we don't swallow
                // exceptions from actual bugs in components.
                (error) => {
                this.setState({
                    error
                });
                }
            )
      }

}