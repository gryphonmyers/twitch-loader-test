require("dom4"); //polyfill for modern DOM APIs
var siteContent = require("../data/content.json");
var FeedLoader = require("./modules/feed-loader");
var AttributeEvaluator = require("./modules/attribute-evaluator");

var attributeEval = new AttributeEvaluator()
    .addContext("siteContent", {
        object: siteContent
    });

window.addEventListener("load", function(){
    var twitchFeed = new FeedLoader({
        JSONPCallback: "callback",
        url: "https://api.twitch.tv/kraken/search/streams?limit={{limit}}&offset={{offset}}&q={{query}}",
        extractEntries: function(data) {
            return data.streams;
        },
        extractNumResults: function(data){
            return data["_total"];
        },
        defaultQuery: "starcraft"
    });
    var queryFormEl = document.query("#feed-query-form");
    var queryInputEl = queryFormEl.query("#feed-query-input");
    queryFormEl.addEventListener("submit", function(e){
        twitchFeed.query(queryInputEl.value);
        e.preventDefault();
    });
    twitchFeed.addEventListener("query", function(e){
        queryInputEl.value = e.detail;
    });

    twitchFeed.initInto(document.query("#feed-wrapper"));

    attributeEval.run("siteContent");
});
