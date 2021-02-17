import React, { Component } from 'react';
import map from 'lodash/map';
var _ = require('lodash');

export default class Balance extends Component {
    render() {
        const { error, balance, isLoading } = this.state;
        let totalBalance = 0;
        let coins = _(balance)
            .map(function(v, k) {
                return _.defaults(v, {key: k ,price: balance[k].priceEur * balance[k].quantity})
            })
            .orderBy('price', 'desc')
            .value();
        console.log(coins)
        
        let coinList = map(coins, (value, key) => {
            totalBalance += coins[key].priceEur * coins[key].quantity
            return (
                <div className="coin">
                    <h3 key={key}>{coins[key].key} &euro;{(coins[key].priceEur * coins[key].quantity).toFixed(2)}</h3>
                    <div>quantity = {coins[key].quantity}</div>
                    <div>$ = { Number(coins[key].priceUsd).toFixed(2) }</div>
                    <div>&#8383; = {coins[key].priceBtc }</div>
                </div>
            )
        })
        
        let btcPrice = map(balance, (value, key) => {
            if(key == 'BTC') {
                return (Number(balance[key].priceEur).toFixed(2))
            }
        })

        if (error) {
          return <div>Error: {error.message}</div>;
        } else {
          return (
            <div>
                <div className={ ` ${this.state.isLoading ? 'loading' : ''} balance` }>
                    <h1>Mijn stacks: &euro;{totalBalance.toFixed(2)} 🚀</h1>
                    <h2>BTC: &euro; {btcPrice}</h2>
                    <div className="coins">{ coinList }</div>
                </div>
                <div className="rocket">🚀</div>
            </div>
          );
        }
    }

    constructor(props) {
        super(props);

        this.state = {
            balance: [],
            btcPrice: '',
            isLoading: true
        }
    }

    componentDidMount() {
        fetch("/balance")
        .then(res => res.json())
        .then(
            (result) => {
            this.setState({
                balance: result,
                isLoading: false
            });
            },
            (error) => {
            this.setState({
                error
            });
            }
        )
    }


}