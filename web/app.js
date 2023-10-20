require('dotenv').config()
const express = require('express')
const multer = require('multer')
const app = express()
const CTRL = require('app-root-path') + '/web/'
const bodyParser = require('body-parser')

// cross domain
const allowCrossDomain = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET,POST')
    res.header('Access-Control-Allow-Headers', 'Content-Type')
    res.header('Access-Control-Allow-Credentials', 'true')
    if (req.method.toLowerCase() == 'options') res.send(200)
    else next()
}

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(allowCrossDomain)
app.use(multer().array())

app.get('/', (_, res) => {
    res.send(`
        <h1>Web3 Crack API</h1>
        <a href="https://github.com/decentralizedlab/web3-crack">See Documentation</a>`)
})

app.all('*', (req, res, next) => {
    try {
        const path = req.path.toString()
        const ctl = path.split('/')[1]
        if (req.method == 'GET') req.body = req.query // get强制转post参数

        // MVC
        const act = path.split('/')[2]
        const fun = require(CTRL + ctl)
        fun[act](req, res, next)
    } catch (e) {
        console.error(e)
        next(e)
    }
})

app.listen(process.env.WEB_PORT)
console.log('Server Started')
