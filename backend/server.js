const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const todoRoutes = express.Router();
const PORT = 4000;

const { write } = require('fs');
const stream = require('stream');
const Binance = require('node-binance-api');
const { callbackify } = require('util');
const { get } = require('http');
const config = require('../config');
const binance = new Binance().options({
  APIKEY: config.key,
  APISECRET: config.secret,
  test:true,
  useServerTime: true,
  recvWindow: 60000, // Set a higher recvWindow to increase response timeout
});

async function getWallet() {
    return new Promise(function(resolve, reject) {
        binance.balance((error, balances) => {
            if ( error ) {
                reject(error);
            }
            resolve(balances);
        })
    })
}

async function getBalance() {
    let balance = await getWallet();
    let newBalance = {}
    let ticker = await binance.prices();
    for(const [key] of Object.entries(balance)) {
        if(balance[key].available > 0 || balance[key].onOrder > 0) {
            const coin = key + 'BTC';
            (async() => {
                if(typeof ticker[coin] != 'undefined') {
                    newBalance[key] = { 
                        priceBtc: ticker[coin],
                        priceEur: ticker.BTCEUR * ticker[coin],
                        priceUsd: ticker.BTCUSDT * ticker[coin],
                        quantity: Number(balance[key].available) + Number(balance[key].onOrder)
                    }
                }
            })();
            if(key == 'BTC') {
                (async() => {
                    newBalance[key] = { 
                        priceBtc: balance[key].available,
                        priceEur: ticker.BTCEUR,
                        priceUsd: ticker.BTCUSDT,
                        quantity: Number(balance[key].available) + Number(balance[key].onOrder)
                    }
                })();
            }
        }
    }
    return new Promise(function(resolve, reject) {
        resolve(newBalance)
    })

}

balance();

async function balance() {
    let test = await getBalance();
    console.log(test)
}

app.get('/balance', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send({ balance: await getBalance() });
})

app.use(cors());
app.use(bodyParser.json());



app.listen(PORT);