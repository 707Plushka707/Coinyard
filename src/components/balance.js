import React, { Component } from 'react';
import map from 'lodash/map';

export default class Balance extends Component {
    render() {
        const { error, balance, test } = this.state;
        let coins = map(balance, (value, key) => {
            if(balance[key].available > 0) {
                return (
                    <h1>{key} {balance[key].available}</h1>
                )
            }
        })
        if (error) {
          return <div>Error: {error.message}</div>;
        } else {
          return (
            <div className="balance">
                { coins }
            </div>
          );
        }
    }

    constructor(props) {
        super(props);

        this.state = {
            balance: [],
            test: ''
        }
    }

    logBalance() {
        console.log()
    }

    componentDidMount() {
        fetch("/balance")
            .then(res => res.json())
            .then(
                (result) => {
                this.setState({
                    balance: result.balans,
                    test: result.test
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