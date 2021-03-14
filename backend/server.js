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

let stake = 100
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
        if(req.body.confirm == 'buy' && global.ticker[req.body.ticker].close < alerts[key].price) {
            Object.assign(alerts[key], {active: false, PnL: pnl})
            console.info('Bar close price lower than order price, closing trade')
            console.info(`Sold ${alerts[key].orderQ} ${key} @ ${req.body.price}, PnL = ${(sellPrice - alerts[key].total).toFixed(2)}`)
        }
    } else {
        Object.assign(alerts[key], {price: req.body.price, interval: req.body.interval, trend: req.body.trend})

        if(alerts[key].trend == 'up') {
            if(!alerts[key].active) {
                console.info(`Awaiting buy confirmation for ${req.body.ticker} on ${req.body.interval}m interval`)
                if(global.ticker[req.body.ticker].close > alerts[key].price) {
                    Object.assign(alerts[key], {active: true, orderQ: stake / req.body.price, total: (stake / req.body.price) * req.body.price})
                    console.info(`Bought ${alerts[key].orderQ} ${key} @ ${req.body.price} (Total: ${alerts[key].total})`)
                }
            }
        } else {
            if(alerts[key].active) {
                sellPrice = alerts[key].orderQ * req.body.price
                
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = alerts[key].PnL + (sellPrice - alerts[key].total)
                } else {
                    pnl = sellPrice - alerts[key].total
                }

                Object.assign(alerts[key], {active: false, PnL: pnl})
                console.info(`Sold ${alerts[key].orderQ} ${key} @ ${req.body.price}, PnL = ${(sellPrice - alerts[key].total).toFixed(2)}`)

            }
        }
    }

    console.info('Current PnL \n')
    for(const [val] of Object.entries(alerts)) {
        if(alerts[val].hasOwnProperty('PnL')) {
            console.info(`${val} PnL = ${(alerts[val].PnL).toFixed(2)}`)
        } else {
            console.info(`${val} PnL = 0 \n`)
        }
    }

})

app.get('/scalping', async (req, res) => {

})

app.use(cors());
app.use(bodyParser.json());


app.listen(PORT);