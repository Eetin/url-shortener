var shortid = require('shortid')
var validUrl = require('valid-url')
var mongoose = require('mongoose')
var express = require('express')
var path = require('path')

var app = express()

mongoose.Promise = global.Promise
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/urlshortener')

var Schema = mongoose.Schema
    
var urlSchema = new Schema({
    original_url: { type: String, required: true, unique: true },
    short_url   : { type: String, required: true, unique: true }
}, {
    capped: { size: 5500000, max: 5000 }
})

var Url = mongoose.model('Url', urlSchema)

app.set('views', path.join(__dirname, 'public'))
app.set('view engine', 'pug')

app.get('/', function(req, res) {
    Url.findOne({ original_url: 'https://www.google.com' }, function(err, url) {
        if (err) return console.log(err)
        if (!url) {
            var newUrl = new Url({
                original_url: 'https://www.google.com',
                short_url   : getUniqueShortUrl()
            })
            newUrl.save(function(err, result) {
                if (err) return res.end('Database error.')
                renderIndex(req, res, result)
            })
        } else {
            renderIndex(req, res, url)
        }
    })
})

app.get('/:short', function(req, res) {
    var shortUrl = req.params.short
    var originalUrl = getOriginalUrl(shortUrl, function(err, url) {
        if (err) return res.end(err)
        res.redirect(url)
    })
})

app.get('/shorten/:url*', function(req, res) {
    var uri = req.url.replace('/shorten/', '')
    if(validUrl.isHttpUri(uri) || validUrl.isHttpsUri(uri)) {
        getShortUrl(uri, function(err, shortUrl) {
            if (err) {
                shortUrl = getUniqueShortUrl()
                var url = new Url({
                    original_url: uri,
                    short_url   : shortUrl
                })
                url.save(function(err, result) {
                    if (err) {
                        res.end('Error generating short URL. Try again')
                        return console.log(err)
                    }
                    var shortUrl = `${req.protocol}://${req.hostname}/${result.short_url}`
                    res.json({
                        original_url: result.original_url,
                        short_url   : shortUrl
                    })
                })
            } else {
                var shortUrl = `${req.protocol}://${req.hostname}/${shortUrl}`
                res.json({
                    original_url: uri,
                    short_url   : shortUrl
                })
            }
        })
    } else {
        res.end('Invalid URL')
    }
})

app.listen(process.env.PORT || 8080)

function renderIndex(req, res, url) {
    res.render('index', {
        appUrl: `${req.protocol}://${req.hostname}/`,
        originalUrl: url.original_url,
        shortUrl   : url.short_url
    })
}

function getShortUrl(originalUrl, callback) {
    Url.findOne({ original_url: originalUrl }, function(err, url) {
        if (err || !url) return callback('Not found')
        callback(null, url.short_url)
    })
}

function getOriginalUrl(shortUrl, callback) {
    if (shortid.isValid(shortUrl)) {
        Url.findOne({ short_url: shortUrl}, function(err, url) {
            if (err) return callback('Invalid Short Url')
            callback(null, url.original_url)
        })
    }
    else callback('Invalid Short URL')
}

function getUniqueShortUrl() {
    var shortUrl = shortid.generate()
    Url.count({ short_url: shortUrl }, function(err, count) {
        if (err) return console.log(err)
        if (count !== 0) return getUniqueShortUrl()
    })
    return shortUrl
}