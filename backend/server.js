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

async function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

const stake = 5
const leverage = 10
let alerts = {}
let key, sellPrice, pnl, trend

app.post("/hook", (req, res, next) => {
    // Create ticker object if it doesnt exist
    key = req.body.ticker + req.body.interval
    
    if(!(key in alerts)) {
        alerts[key] = {};
        Object.assign(alerts[key], {active: false, price: req.body.price, pendingSell: false, pendingBuy: false, started: false});
    } else {
        Object.assign(alerts[key], {price: req.body.price});
    }
    console.log(alerts)
    console.log(new Date().toString());
    if(!alerts[key].hasOwnProperty('direction')) {
        if(req.body.vwap > 0) {
            Object.assign(alerts[key], {"direction": "up"});
        } else if(req.body.vwap < 0) {
            Object.assign(alerts[key], {"direction": "down"});
        }
    }
    console.log(`${key} direction: ${alerts[key].direction} VWAP: ${req.body.vwap}`);
    if(alerts[key].direction == 'up' && req.body.vwap < 0) {
        Object.assign(alerts[key], {started: true});
    } else if (alerts[key].direction == 'down' && req.body.vwwap > 0) {
        Object.assign(alerts[key], {started: true});
    }

    (async () => {
        let position_data = await binance.futuresPositionRisk(), markets = Object.keys( position_data );
        for ( let market of markets ) {
            let symbol = position_data[market].symbol + req.body.interval;
            let size = position_data[market].positionAmt;
            if(size == 0) continue;
            console.log(symbol);
            if((symbol in alerts)) {
                Object.assign(alerts[symbol], {quantity: size});
                console.log(alerts[symbol]);
            }
          //console.info( obj ); //positionAmt entryPrice markPrice unRealizedProfit liquidationPrice leverage marginType isolatedMargin isAutoAddMargin maxNotionalValue
        }
    })();
    
    if(alerts[key].started) {
        if(req.body.vwap > 0) {
            if(alerts[key].pendingBuy && !alerts[key].active) {
                (async () => {
                    let order = await longOrder(req.body.ticker, req.body.price);
                    Object.assign(alerts[key], {active: true, trend: req.body.trend, interval: req.body.interval, orderId: order.orderId, orderQ: order.cumQty, total: order.cumQuote, price: order.avgPrice, time: order.updateTime });
                    console.info(`${new Date(order.updateTime)} - Placed long order: ${order.avgPrice} * ${order.cumQty}  (total: ${order.cumQuote})`);
                })();
                Object.assign(alerts[key], {pendingBuy: false});
            } else if(!alerts[key].pendingBuy && !alerts[key].active) {
                Object.assign(alerts[key], {pendingBuy: true});
            }
            if(alerts[key].pendingSell) {
                Object.assign(alerts[key], {pendingSell: false});
            }
            if(alerts[key].trend == 'down' && alerts[key].active) {
                sellPrice = alerts[key].orderQ * req.body.price;
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = alerts[key].PnL + (alerts[key].total - sellPrice) - 0.08;
                } else {
                    pnl = (alerts[key].total - sellPrice)  - 0.08;
                };
                (async () => {
                    let order = await closeShort(req.body.ticker, alerts[key].quantity);
                    Object.assign(alerts[key], {active: false, PnL: pnl });
                    console.log(`Closed position for ${req.body.ticker}`)
                })();
                Object.assign(alerts[key], {pendingBuy: true});
            }
        } else if(req.body.vwap < 0) {
            if(alerts[key].pendingSell && !alerts[key].active) {
                (async () => {
                    let order = await shortOrder(req.body.ticker, req.body.price);
                    Object.assign(alerts[key], {active: true, trend: req.body.trend, interval: req.body.interval, orderId: order.orderId, orderQ: order.cumQty, total: order.cumQuote, price: order.avgPrice, time: order.updateTime });
                    console.info(`${new Date(order.updateTime)} - Placed short order: ${order.avgPrice} * ${order.cumQty}  (total: ${order.cumQuote})`);
                })();
                Object.assign(alerts[key], {pendingSell: false});
            } else if(!alerts[key].pendingSell && !alerts[key].active) {
                Object.assign(alerts[key], {pendingSell: true});
            }
            if(alerts[key].pendingBuy) {
                Object.assign(alerts[key], {pendingBuy: false});
            }
            if(alerts[key].trend == 'up' && alerts[key].active) {
                sellPrice = alerts[key].orderQ * req.body.price;
                if(alerts[key].hasOwnProperty('PnL')) {
                    pnl = alerts[key].PnL + (alerts[key].total - sellPrice) - 0.08;
                } else {
                    pnl = (alerts[key].total - sellPrice)  - 0.08;
                }
                (async () => {
                    let order = await closeLong(req.body.ticker, alerts[key].quantity);
                    Object.assign(alerts[key], {active: false, PnL: pnl });
                    console.log(`Closed position for ${req.body.ticker}`)
                })();
                Object.assign(alerts[key], {pendingSell: false});
            }
        }
    } else {
        console.info(`Waiting for VWAP to cross plot, current vwap ${req.body.vwap}`);
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
    console.log('Longing...')
    // Adjust leverage and change margin type to isolated
    await binance.futuresLeverage( ticker, leverage );
    await binance.futuresMarginType( ticker, 'ISOLATED' );
    let quantity = ((stake / price) * leverage);
    // Set minimum order amount with minQty
    if ( quantity < global.filters[ticker].minQty ) quantity = global.filters[ticker].minQty;

    // Set minimum order amount with minNotional
    if ( price * quantity < global.filters[ticker].minNotional ) {
        quantity = global.filters[ticker].minNotional / price;
    }
    let amount = binance.roundStep(quantity, global.filters[ticker].stepSize);
    let futureBuyOrder = await binance.futuresMarketBuy( ticker, amount, { newOrderRespType: 'RESULT' } );
    // console.log(futureBuyOrder);
    return new Promise(function(resolve, reject) {
        resolve(futureBuyOrder);
    });
}

async function shortOrder(ticker, price) {
    console.log('Shorting...')
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

async function closeShort(ticker, amount) {
    let response = await binance.futuresMarketBuy( ticker, Math.abs(amount), { newOrderRespType: 'RESULT' } );
    console.log(response);
    return new Promise(function(resolve, reject) {
        resolve(response);
    });
}
async function closeLong(ticker, amount) {
    let response = await binance.futuresMarketSell( ticker, Math.abs(amount), { newOrderRespType: 'RESULT' } );
    console.log(response);
    return new Promise(function(resolve, reject) {
        resolve(response);
    });
}

app.get('/scalping', async (req, res) => {

})

app.use(cors());
app.use(bodyParser.json());


app.listen(PORT);