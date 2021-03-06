/**
 * Created by vinhjs on 9/26/18.
 */
var request = require('request');
var async = require('async');
var cheerio = require('cheerio');
var cheerioTableparser = require('cheerio-tableparser');

var MongoClient = require('mongodb').MongoClient;


var alphas = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
var alphaIndex = 0;
var count = 0;
var page = 1;

MongoClient.connect("mongodb://192.168.2.85:27017", function(err, client) {
    if (client) {
        var db = client.db("testCopy");
        var Airport = db.collection('Airport');
        async.whilst(
            function() { return count < 1; },
            function(callback) {
                if(alphas[alphaIndex]) {
                    var url = "https://www.world-airport-codes.com/alphabetical/airport-name/"+alphas[alphaIndex].toLowerCase()+".html?page=" + page;
                    craw(url, function(err, data){
                        if (data) {
                            if (data.code == 1) {
                                alphaIndex++;
                                page=1;
                                callback(null);
                            } else {
                                //save to database
                                Airport.insertMany(data.data, function(err, result) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    page++;
                                    callback(null);
                                })
                            }
                        } else {
                            callback(true);
                        }
                    })
                } else {
                    callback(true);
                }        
            },
            function (err, n) {
                console.log("DONE");
            }
        );
    }
})
function craw(url, cb){
    request.get({url: url}, function(err, response, body){
        if (!err && response.statusCode == 200) {
            var $ = cheerio.load(body);
            cheerioTableparser($);
            var data = $(".stack2").parsetable();
            var result = [];
            data[0].forEach(function(airport){
                if (airport.indexOf("href") != -1) {
                    var href = airport.substring(airport.indexOf("/"), airport.indexOf("html"));
                    console.log(url + " ==== " + href);
                    result.push({href: href, isActive: false});
                }
            })
            cb(null, {code: 0, data: result})
        } else if (response && response.statusCode == 404) {
            cb(null, {code: 1})
        } else {
            console.log('Error');
            console.log(err);
            process.exit();
        }
    })
}
