import React, { Component } from 'react';
import map from 'lodash/map';

export default class Balance extends Component {
    render() {
        const { error, balance, isLoading } = this.state;
        let totalBalance = 0;
        let coins = map(balance, (value, key) => {
            if(balance[key].quantity > 0) {
                totalBalance += balance[key].priceEur * balance[key].quantity
                return (
                    <h3 key={key}>{key} &euro;{(balance[key].priceEur * balance[key].quantity).toFixed(2)}</h3>
                )
            }
        })
        


        let btcPrice = map(balance, (value, key) => {
            if(key === 'BTC') {
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
                    { coins }
                </div>
                <div class="rocket">🚀</div>
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
        this.fetchBalance();
        this.interval = setInterval(() => {
            this.fetchBalance();
        }, 1000)
    }

    fetchBalance() {
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