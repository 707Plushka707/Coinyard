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

let newOrders = {};
async function getOrders() {
  // for(const [key] of Object.entries(global.ticker)) {
    return new Promise(function(resolve, reject) {
    binance.allOrders('REEFBTC', (error, orders, symbol) => {
      resolve(orders)
  });
  // }
  })
};

module.exports = async function() {
  let orders = await getOrders();
  return orders;
};