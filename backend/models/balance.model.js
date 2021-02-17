const { write } = require('fs');
const stream = require('stream');
const Binance = require('node-binance-api');
const { callbackify } = require('util');
const { get } = require('http');
const config = require('../../config');
const binance = new Binance().options({
  APIKEY: config.key,
  APISECRET: config.secret,
  test:true,
  useServerTime: true,
  recvWindow: 60000, // Set a higher recvWindow to increase response timeout
});
require('./ticker.model');

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
    for(const [key] of Object.entries(balance)) {
        if(balance[key].available > 0 || balance[key].onOrder > 0) {
            let coin = key;
            let found = false;
            let pairing, priceBtc, priceEur, priceUsd;
            if(typeof global.ticker[coin + 'BTC'] != 'undefined') {
                pairing = key + 'BTC';
                priceBtc = global.ticker[pairing].close;
                priceEur = global.ticker[pairing].close * global.ticker['BTCEUR'].close;
                priceUsd = global.ticker[pairing].close * global.ticker['BTCUSDT'].close;
                found = true;
            } else if (key == 'BTC') {
                pairing = 'BTCEUR'
                priceBtc = 1;
                priceEur = global.ticker['BTCEUR'].close;
                priceUsd = global.ticker['BTCUSDT'].close;
                found = true;
            } else if (typeof global.ticker[coin + 'BNB'] != 'undefined' && !found){
                pairing = key + 'BNB';
                priceBtc = global.ticker[pairing].close * global.ticker['BNBBTC'].close;
                priceEur = global.ticker[pairing].close * global.ticker['BNBEUR'].close;
                priceUsd = global.ticker[pairing].close * global.ticker['BNBUSDT'].close;
                found = true;
            } else if (typeof global.ticker[coin + 'USDT'] != 'undefined' && !found) {
                pairing = key + 'USDT';
                priceBtc = global.ticker[pairing].close * global.ticker['BTCUSDT'].close;
                priceEur = global.ticker[pairing].close / global.ticker['EURUSDT'].close;
                priceUsd = global.ticker[pairing].close;
                found = true;
            } else if (typeof global.ticker[coin + 'ETH'] != 'undefined' && !found) {
                pairing = key + 'ETH';
                priceBtc = global.ticker[pairing].close * global.ticker['ETHBTC'].close;
                priceEur = global.ticker[pairing].close * global.ticker['ETHEUR'].close;
                priceUsd = global.ticker[pairing].close * global.ticker['ETHUSDT'].close;
                found = true;
            } else {
                found = false;
            }

            if(found) {
                newBalance[key] = { 
                    priceBtc: priceBtc,
                    priceEur: priceEur,
                    priceUsd: priceUsd,
                    quantity: Number(balance[key].available) + Number(balance[key].onOrder)
                }
            }
        }
    }
    return new Promise(function(resolve, reject) {
        resolve(newBalance)
    })
}

module.exports = async function() {
    console.log(await getBalance());
    let balance = await getBalance();
    return balance;
};