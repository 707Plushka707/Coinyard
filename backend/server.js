const express = require('express');
const app = express();
const Binance = require('node-binance-api');
const bodyParser = require('body-parser');
const cors = require('cors');
const todoRoutes = express.Router();
const PORT = 4000;
let balance = require('./models/balance.model');
let orders = require('./models/orders.model');
const config = require('../config');
const binance = new Binance().options({
  APIKEY: config.key,
  APISECRET: config.secret,
  useServerTime: true,
  recvWindow: 60000, // Set a higher recvWindow to increase response timeout
});
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

binance.exchangeInfo(function(error, data) {
	let minimums = {};
	for ( let obj of data.symbols ) {
		let filters = {status: obj.status};
		for ( let filter of obj.filters ) {
			if ( filter.filterType == "MIN_NOTIONAL" ) {
				filters.minNotional = filter.minNotional;
			} else if ( filter.filterType == "PRICE_FILTER" ) {
				filters.minPrice = filter.minPrice;
				filters.maxPrice = filter.maxPrice;
				filters.tickSize = filter.tickSize;
			} else if ( filter.filterType == "LOT_SIZE" ) {
				filters.stepSize = filter.stepSize;
				filters.minQty = filter.minQty;
				filters.maxQty = filter.maxQty;
			}
		}
		//filters.baseAssetPrecision = obj.baseAssetPrecision;
		//filters.quoteAssetPrecision = obj.quoteAssetPrecision;
		filters.orderTypes = obj.orderTypes;
		filters.icebergAllowed = obj.icebergAllowed;
		minimums[obj.symbol] = filters;
	}
	global.filters = minimums;
	//fs.writeFile("minimums.json", JSON.stringify(minimums, null, 4), function(err){});
});

const stake = 2
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
                sellPrice = alerts[key].orderQ * req.body.price;
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = (alerts[key].PnL + (sellPrice - alerts[key].total)) - 0.08;
                } else {
                    pnl = (sellPrice - alerts[key].total) - 0.08;
                }
                console.info('Bar close price lower than order price, closing position');
                (async () => {
                    let close = await closeOrder(req.body.ticker, alerts[key].orderId);
                    Object.assign(alerts[key], {active: false, PnL: pnl});
                    console.info(`${new Date(close.updateTime)} - Closed long order for ${req.body.ticker} (${alerts[key].orderId}) @ ${close.avgPrice}`);
                })();
            } else if(req.body.confirm == 'sell' && req.body.vwap > 0) {
                sellPrice = alerts[key].orderQ * req.body.price;
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = (alerts[key].PnL + (alerts[key].total - sellPrice)) - 0.08;
                } else {
                    pnl = (alerts[key].total - sellPrice) - 0.08;
                }
                console.info('Bar close price higher than order price, closing position');
                (async () => {
                    let close = await closeOrder(req.body.ticker, alerts[key].orderId);
                    Object.assign(alerts[key], {active: false, PnL: pnl});
                    console.info(`${new Date(close.updateTime)} - Closed short order for ${req.body.ticker} (${alerts[key].orderId}) @ ${close.avgPrice}`);
                })();
            } else {
                Object.assign(alerts[key], {confirmed: true});
            }
        }
    } else {
        if(req.body.trend == 'up') {
            if(alerts[key].trend == 'down' && alerts[key].active && alerts[key].confirmed) {
                sellPrice = alerts[key].orderQ * req.body.price;
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = alerts[key].PnL + (alerts[key].total - sellPrice) - 0.08;
                } else {
                    pnl = (alerts[key].total - sellPrice)  - 0.08;
                }
                (async () => {
                    let close = await closeOrder(req.body.ticker, alerts[key].orderId);
                    console.info(`${new Date(close.updateTime)} - Closed short order for ${req.body.ticker} (${alerts[key].orderId}) @ ${close.avgPrice}`);
                    let order = await longOrder(req.body.ticker, req.body.price);
                    Object.assign(alerts[key], {PnL: pnl, confirmed: false, active: true, trend: req.body.trend, interval: req.body.interval, orderId: order.orderId, orderQ: order.cumQty, total: order.cumQuote, price: order.avgPrice, time: order.updateTime });
                    console.info(`${new Date(order.updateTime)} - Placed long order: ${order.avgPrice} * ${order.cumQty}  (total: ${order.cumQuote})`);
                })();
            } else if(!alerts[key].hasOwnProperty('trend')) {
                (async () => {
                    let order = await longOrder(req.body.ticker, req.body.price);
                    Object.assign(alerts[key], {active: true, confirmed: false, trend: req.body.trend, interval: req.body.interval, orderId: order.orderId, orderQ: order.cumQty, total: order.cumQuote, price: order.avgPrice, time: order.updateTime });
                    console.info(`${new Date(order.updateTime)} - Placed long order: ${order.avgPrice} * ${order.cumQty}  (total: ${order.cumQuote})`);
                })();
            } else if(alerts[key].trend == 'up' && !alerts[key].active){
                (async () => {
                    let order = await longOrder(req.body.ticker, req.body.price);
                    Object.assign(alerts[key], {active: true, confirmed: false, trend: req.body.trend, interval: req.body.interval, orderId: order.orderId, orderQ: order.cumQty, total: order.cumQuote, price: order.avgPrice, time: order.updateTime });
                    console.info(`${new Date(order.updateTime)} - Placed long order: ${order.avgPrice} * ${order.cumQty}  (total: ${order.cumQuote})`);
                })();
            }
        } else if(req.body.trend == 'down') {
            if(alerts[key].trend == 'up' && alerts[key].active && alerts[key].confirmed) {
                sellPrice = alerts[key].orderQ * req.body.price;
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = alerts[key].PnL + (alerts[key].total - sellPrice) - 0.08;
                } else {
                    pnl = (alerts[key].total - sellPrice)  - 0.08;
                }
                (async () => {
                    let close = await closeOrder(req.body.ticker, alerts[key].orderId);
                    console.info(`${new Date(close.updateTime)} - Closed long order for ${req.body.ticker} (${alerts[key].orderId}) @ ${close.avgPrice}`)
                    let order = await shortOrder(req.body.ticker, req.body.price);
                    Object.assign(alerts[key], {PnL: pnl, confirmed: false, active: true, trend: req.body.trend, interval: req.body.interval, orderId: order.orderId, orderQ: order.cumQty, total: order.cumQuote, price: order.avgPrice, time: order.updateTime });
                    console.info(`${new Date(order.updateTime)} - Placed short order: ${order.avgPrice} * ${order.cumQty}  (total: ${order.cumQuote})`);
                })();
            } else if(!alerts[key].hasOwnProperty('trend')) {
                (async () => {
                    let order = await shortOrder(req.body.ticker, req.body.price);
                    Object.assign(alerts[key], {active: true, confirmed: false, trend: req.body.trend, interval: req.body.interval, orderId: order.orderId, orderQ: order.cumQty, total: order.cumQuote, price: order.avgPrice, time: order.updateTime });
                    console.info(`${new Date(order.updateTime)} - Placed short order: ${order.avgPrice} * ${order.cumQty}  (total: ${order.cumQuote})`);
                })();
            } else if(alerts[key].trend == 'down' && !alerts[key].active){
                (async () => {
                    let order = await shortOrder(req.body.ticker, req.body.price);
                    Object.assign(alerts[key], {active: true, confirmed: false, trend: req.body.trend, interval: req.body.interval, orderId: order.orderId, orderQ: order.cumQty, total: order.cumQuote, price: order.avgPrice, time: order.updateTime });
                    console.info(`${new Date(order.updateTime)} - Placed short order: ${order.avgPrice} * ${order.cumQty}  (total: ${order.cumQuote})`);
                })();
            }
        }
    }
    // if(req.body.confirm != 'buy' || req.body.confirm != 'sell') {
    // console.info('Current PnL \n');
    //     for(const [val] of Object.entries(alerts)) {
    //         if(alerts[val].hasOwnProperty('PnL')) {
    //             console.info(`${val} PnL = ${(alerts[val].PnL)}`);
    //         } else {
    //             console.info(`${val} PnL = 0 \n`);
    //         }
    //     }
    // }

})

async function longOrder(ticker, price) {
    // Adjust leverage and change margin type to isolated
    console.info( await binance.futuresLeverage( ticker, leverage ) );
    console.info( await binance.futuresMarginType( ticker, 'ISOLATED' ) );
    let quantity = ((stake / price) * leverage);
    // Set minimum order amount with minQty
    if ( quantity < global.filters[ticker].minQty ) quantity = global.filters[ticker].minQty;

    // Set minimum order amount with minNotional
    if ( price * quantity < global.filters[ticker].minNotional ) {
        quantity = global.filters[ticker].minNotional / price;
    }
    let amount = binance.roundStep(quantity, global.filters[ticker].stepSize);
    let futureBuyOrder = await binance.futuresMarketBuy( ticker, amount, { newOrderRespType: 'RESULT' } );
    console.log(futureBuyOrder);
    return new Promise(function(resolve, reject) {
        resolve(futureBuyOrder);
    });
}

async function shortOrder(ticker, price) {
    // Adjust leverage and change margin type to isolated
    console.info( await binance.futuresLeverage( ticker, leverage ) );
    console.info( await binance.futuresMarginType( ticker, 'ISOLATED' ) );
    let quantity = ((stake / price) * leverage);
    // Set minimum order amount with minQty
    if ( quantity < global.filters[ticker].minQty ) quantity = global.filters[ticker].minQty;

    // Set minimum order amount with minNotional
    if ( price * quantity < global.filters[ticker].minNotional ) {
        quantity = global.filters[ticker].minNotional / price;
    }
    let amount = binance.roundStep(quantity, global.filters[ticker].stepSize)
    let futureSellOrder = await binance.futuresMarketSell( ticker, amount, { newOrderRespType: 'RESULT' } );
    console.log(futureSellOrder)
    return new Promise(function(resolve, reject) {
        resolve(futureSellOrder);
    });
}

async function closeOrder(ticker, orderId) {
    let futureCancel = await binance.futuresCancel( ticker, {orderId: orderId} );
    return new Promise(function(resolve, reject) {
        resolve(futureCancel);
    });
}

app.get('/scalping', async (req, res) => {

})

app.use(cors());
app.use(bodyParser.json());


app.listen(PORT);