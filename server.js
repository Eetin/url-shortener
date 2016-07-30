var express = require('express')
var app = express()

app.get('/', function(req, res) {
    res.end('Welcome to URL Shortener Microservice')
})

app.listen(process.env.PORT || 8080)