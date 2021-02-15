const Binance = require('node-binance-api');
const config = require('../../config');
const binance = new Binance().options({
    APIKEY: config.key,
    APISECRET: config.secret,
    test:true,
    useServerTime: true,
    recvWindow: 60000, // Set a higher recvWindow to increase response timeout
  });
  
global.ticker = {};

binance.websockets.prevDay(false, (error, response) => {
    // if ( response.symbol.endsWith('BTC') && response.symbol.endsWith('USDT') && response.symbol.endsWith('EUR') ) {
        global.ticker[response.symbol] = response;
    // }
});