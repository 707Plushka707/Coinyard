import React, { Component } from 'react';
import map from 'lodash/map';

export default class Scalping extends Component {
    render() {
        const { error, scalping } = this.state;

        return (
            <div>
                { scalping }
            </div>
        );
    }

    constructor(props) {
        super(props);

        this.state = {
            scalping: []
        }
    }

    componentDidMount() {
        fetch("/scalping")
        .then(res => res.json())
        .then(
            (result) => {
            this.setState({
                scalping: result
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