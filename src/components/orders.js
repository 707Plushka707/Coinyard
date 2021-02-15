import React, { Component } from 'react';
import map from 'lodash/map';

export default class Orders extends Component {
    render() {
        const { error, orders } = this.state;
        let orderList = map(orders, (value, key) => {
            return (
                <div key={key}>{ key }</div>
            )
        })

        if (error) {
          return <div>Error: {error.message}</div>;
        } else {
          return (
            <div>
                <h1>Orders</h1>
                { orderList }
            </div>
          );
        }
    }

    constructor(props) {
        super(props);

        this.state = {
            orders: []
        }
    }

    componentDidMount() {
        fetch("/orders")
        .then(res => res.json())
        .then(
            (result) => {
            this.setState({
                orders: result
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