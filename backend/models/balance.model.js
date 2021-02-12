const { write } = require('fs');
const stream = require('stream');
const Binance = require('node-binance-api');
const { callbackify } = require('util');
const binance f',
  test:true,
  useServerTime: true,
  recvWindow: 60000, // Set a higher recvWindow to increase response timeout
});

async function getBalance() {
    return new Promise(function(resolve, reject) {
        binance.balance((error, balances) => {
            if ( error ) {
                reject(error);
            }
            resolve(balances);
        })
    })
}


module.exports = async function() {
    let balance = await getBalance();
    return balance;
}


