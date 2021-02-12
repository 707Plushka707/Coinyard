const { write } = require('fs');
const stream = require('stream');
const Binance = require('node-binance-api');
const { callbackify } = require('util');
const binance = new Binance().options({
  APIKEY: '',
  APISECRET: '',
  test:true,
  useServerTime: true,
  // verbose: true,
  recvWindow: 60000, // Set a higher recvWindow to increase response timeout
});

const stake = 100;
let newTicker = [];
let time;
console.log('hallo?')


const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});
 
readline.question('Place an order :', coin => {
  console.time('orderTime');
  calcQuantity(coin.toUpperCase())
  readline.close();
});

setInterval(() => {
  (async() => {
    try {
      let ticker = await binance.prices();
      newTicker = ticker
      
    } catch(e) {
      console.error(e);
    }
  })();
}, 100);


async function calcQuantity(coin) {
  (async() => {
    time = await binance.time()
  })();
  console.log(JSON.stringify(time.body))
  let stakeInBtc = (stake / (newTicker.BTCEUR)).toFixed(8);
  console.log(await binance.time());
  let coinPrice = newTicker[coin + 'BTC'];
  console.timeLog('orderTime');
  let quantity = (stakeInBtc / coinPrice).toFixed(0);
  console.timeLog('orderTime');
  marketBuy(coin, quantity);
}

async function marketBuy(coin, quantity) {
  return new Promise(function(resolve, reject) {
    binance.marketBuy(coin + 'BTC', quantity, (error, response) => {
      if(error) {
        console.log(error);
        reject(error);
      } else {
        coinBought();
        console.info(`Bought ${quantity} ${coin}`);
        resolve(response);
        // priceTicker(coin);
      }
    });

  });
}

async function coinBought() {

}

async function writePrice(coin) {
  let price = await getPrice(coin)
  console.log(price)
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});


async function fetchBtcEuro() {
  return new Promise(function(resolve, reject) {
    binance.prices('BTCEUR', (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.BTCEUR);
        console.timeLog('orderTime')
      }
    });
  });
}

async function fetchCoinBtc(coin) {
  return new Promise(function(resolve, reject) {
    binance.prices(coin, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response[coin]);
        console.timeLog('orderTime')
      }
    });
  });
}

async function priceTicker(coin) {
    const coinPrice = await fetchCoinBtc(coin)
    let gain = 0;
    setInterval(() => {
      binance.prices(coin + 'BTC', (error, ticker) => {
        gain = ticker[coin + 'BTC'] - coinPrice
        gain = (gain / ticker[coin + 'BTC']) * 100 
        process.stdout.write(`Gain = ${gain.toFixed(2)}% \r`);
        // console.info(`Gain = ${gain.toFixed(2)}%`)
      });
    }, 100);
}

