const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const todoRoutes = express.Router();
const PORT = 4000;
let balance = require('./models/balance.model');
let orders = require('./models/orders.model');

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

app.use(cors());
app.use(bodyParser.json());


app.listen(PORT);