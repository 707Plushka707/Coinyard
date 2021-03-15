const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const todoRoutes = express.Router();
const PORT = 4000;
let balance = require('./models/balance.model');
let orders = require('./models/orders.model');
require('./models/ticker.model');

app.use(express.json());

app.get('/balance', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    balance().then(result => {
        res.send(result);
    }).catch(err => {
        console.error(err);
    })
})

app.get('/orders', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    orders().then(result => {
        res.send(result);
    }).catch(err => {
        console.error(err);
    })
})

const stake = 100
const leverage = 1
let alerts = {}
let key, sellPrice, pnl
app.post("/hook", (req, res, next) => {
    // Create ticker object if it doesnt exist
    key = req.body.ticker + req.body.interval
    
    if(!(key in alerts)) {
        alerts[key] = {}
    }
  
    // If bar close price 
    if(req.body.confirm == 'buy' || req.body.confirm == 'sell') {
        if(alerts[key].hasOwnProperty('trend')) {
            if(req.body.confirm == 'buy' && req.body.vwap < 0) {
                sellPrice = alerts[key].orderQ * req.body.price
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = (alerts[key].PnL + (sellPrice - alerts[key].total)) - 0.08
                } else {
                    pnl = (sellPrice - alerts[key].total) - 0.08
                }
                Object.assign(alerts[key], {active: false, PnL: pnl})
                console.info('Bar close price lower than order price, closing position')
                console.info(`${req.body.time} - Closed long ${alerts[key].orderQ} ${key} @ ${req.body.price}, PnL = ${(sellPrice - alerts[key].total).toFixed(2)}`)
            } else if(req.body.confirm == 'sell' && req.body.vwap > 0) {
                sellPrice = alerts[key].orderQ * req.body.price
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = (alerts[key].PnL + (alerts[key].total - sellPrice)) - 0.08
                } else {
                    pnl = (alerts[key].total - sellPrice) - 0.08
                }
                Object.assign(alerts[key], {active: false, PnL: pnl})
                console.info('Bar close price higher than order price, closing position')
                console.info(`${req.body.time} - Closed short ${alerts[key].orderQ} ${key} @ ${req.body.price}, PnL = ${(alerts[key].total - sellPrice).toFixed(2)}`)
            }
        }
    } else {
        if(req.body.trend == 'up') {
            if(alerts[key].trend == 'down' && alerts[key].active) {
                sellPrice = alerts[key].orderQ * req.body.price
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = alerts[key].PnL + (alerts[key].total - sellPrice) - 0.08
                } else {
                    pnl = (alerts[key].total - sellPrice)  - 0.08
                }
                console.info(`${req.body.time} - Closed short position (${leverage}x) ${alerts[key].orderQ} ${key} @ ${req.body.price}, PnL = ${(alerts[key].total - sellPrice)}`)
                Object.assign(alerts[key], {PnL: pnl, active: true, trend: req.body.trend, orderQ: stake / req.body.price, total: (stake / req.body.price) * req.body.price, price: req.body.price, interval: req.body.interval})
                console.info(`${req.body.time} - Opened long position (${leverage}x) ${alerts[key].orderQ} ${key} @ ${req.body.price}`)
            } else if(!alerts[key].hasOwnProperty('trend')) {
                Object.assign(alerts[key], {active: true, trend: req.body.trend, orderQ: stake / req.body.price, total: (stake / req.body.price) * req.body.price, price: req.body.price, interval: req.body.interval})
                console.info(`${req.body.time} - Opened long position (${leverage}x) ${alerts[key].orderQ} ${key} @ ${req.body.price}`)
            } else if(alerts[key].trend == 'up' && !alerts[key].active){
                Object.assign(alerts[key], {active: true, trend: req.body.trend, orderQ: stake / req.body.price, total: (stake / req.body.price) * req.body.price, price: req.body.price, interval: req.body.interval})
                console.info(`${req.body.time} - Opened long position (${leverage}x) ${alerts[key].orderQ} ${key} @ ${req.body.price}`)
            }
        } else if(req.body.trend == 'down') {
            if(alerts[key].trend == 'up' && alerts[key].active) {
                sellPrice = alerts[key].orderQ * req.body.price
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = (alerts[key].PnL + (sellPrice - alerts[key].total)) - 0.08
                } else {
                    pnl = (sellPrice - alerts[key].total)  - 0.08
                }
                console.info(`${req.body.time} - Closed long position (${leverage}x) ${alerts[key].orderQ} ${key} @ ${req.body.price}, PnL = ${(sellPrice - alerts[key].total)}`)
                Object.assign(alerts[key], {PnL: pnl, active: true, trend: req.body.trend, orderQ: stake / req.body.price, total: (stake / req.body.price) * req.body.price, price: req.body.price, interval: req.body.interval})
                console.info(`${req.body.time} - Opened short position (${leverage}x) ${alerts[key].orderQ} ${key} @ ${req.body.price}`)
            } else if(!alerts[key].hasOwnProperty('trend')) {
                Object.assign(alerts[key], {active: true, trend: req.body.trend, orderQ: stake / req.body.price, total: (stake / req.body.price) * req.body.price, price: req.body.price, interval: req.body.interval})
                console.info(`${req.body.time} - Opened short position (${leverage}x) ${alerts[key].orderQ} ${key} @ ${req.body.price}`)
            } else {
                Object.assign(alerts[key], {active: true, trend: req.body.trend, orderQ: stake / req.body.price, total: (stake / req.body.price) * req.body.price, price: req.body.price, interval: req.body.interval})
                console.info(`${req.body.time} - Opened short position (${leverage}x) ${alerts[key].orderQ} ${key} @ ${req.body.price}`)
            }
        }
    }
    if(req.body.confirm != 'buy' || req.body.confirm != 'sell') {
    console.info('Current PnL \n')
        for(const [val] of Object.entries(alerts)) {
            if(alerts[val].hasOwnProperty('PnL')) {
                console.info(`${val} PnL = ${(alerts[val].PnL)}`)
            } else {
                console.info(`${val} PnL = 0 \n`)
            }
        }
    }

})

function confirmBuy(coin, price, interval) {
    let timeout
    setTimeout(function() {

    }, )
}

app.get('/scalping', async (req, res) => {

})

app.use(cors());
app.use(bodyParser.json());


app.listen(PORT);