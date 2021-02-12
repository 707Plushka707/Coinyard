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

async function getBalance() {
    return new Promise(function(resolve, reject) {
        binance.balance((error, balances) => {
            if ( error ) {
                reject(error);
            }
            // let balance = balances.filter(function(a){
            //     return (a.available > 0);
            // })
            resolve(balances);
        })
    })
}

(async() => {
    console.log(await getBalance())
})

app.get('/balance', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send({ balans: await getBalance(), test: 'test'});
})

app.use(cors());
app.use(bodyParser.json());



app.listen(PORT);