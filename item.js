/**
 * Created by vinhjs on 9/26/18.
 */
var request = require('request');
var async = require('async');
var cheerio = require('cheerio');
var _ = require("lodash");

var MongoClient = require('mongodb').MongoClient;
MongoClient.connect("mongodb://192.168.2.85:27017", function(err, client) {
    if (client) {
        var db = client.db("testCopy");
        var Airport = db.collection('Airport');
        var len = 20;
        var limit = 20;
        async.whilst(
            function() { return len == limit; },
            function(callback) {
                Airport.find({timezone: {$exists: false}}).limit(limit).toArray(function(err, docs) {
                    if (!err && docs){
                        len = docs.length;
                        async.forEach(docs, function(doc, cback){
                            var url = "https://www.world-airport-codes.com" + doc.href + "html";
                            craw(url, function(info){
                                if (info) {
                                    Airport.updateOne({ _id : doc._id }
                                        , { $set: info }, function(err, result) {
                                        if (err) {
                                            console.log(err);
                                        }
                                        cback();
                                    }); 
                                } else {
                                    cback();
                                }
                            })
                        }, function(){
                            callback();
                        })
                    }
                });
            },
            function (err, n) {
                console.log("DONE");
            }
        );
        function craw(url, cb){
            request.get({url: url}, function(err, response, body){
                if (!err && response.statusCode == 200) {
                    var $ = cheerio.load(body);
                    var dataLoc = $(".airport-map-location").attr()['data-location'].split(",");
                    var timezone = $("#timezone").attr().value.split(" ")[0];
                    var faacode = $("#faacode").attr().value;
                    var icaocode = $("#icaocode").attr().value;
                    var iatacode = $("#iatacode").attr().value;
                    var airportTitle = _.trim(_.replace(_.replace($('h1[class=airport-title]').text(), /\n/g, ""),"("+(iatacode || icaocode)+")",""))
                    var airportType = $('span[class="info label"]').text()
                    var lat = dataLoc[0];
                    var lon = dataLoc[1];
                    var address = "";
                    $('p[class=subheader]').each(function(i, elem) {
                        if (i==0) {
                            address = _.trim(_.replace($(this).text(), /\n/g, "").split("\t")[0]).split(",");
                        }
                    });
                    var city = address[0];
                    var country = _.trim(address[1]);
                    // console.log(address)
                    var airport = {
                        geo: [parseFloat(lon), parseFloat(lat)],
                        timezone: timezone,
                        faa: faacode,
                        iata: iatacode,
                        icao: icaocode,
                        name: airportTitle,
                        type: airportType,
                        city: city,
                        country: country
                    }
                    cb(airport);
                    // cb(null, {code: 0, data: result})
                } else if (response && response.statusCode == 404) {
                    cb(false);
                } else {
                    console.log('Error');
                    console.log(err);
                    process.exit();
                }
            })
        }
    }
})

    
