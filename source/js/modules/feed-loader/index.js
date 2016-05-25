require("dom4");
var EventEmitter = require("../event-target");
var extend = require("../extends");
var defaults = require("lodash/defaultsDeep");
var get = require("../xhr-promise");
var parseHTML = require("../parse-html");
var supplant = require("../string-supplant");
var hash = require("../hash-string");
var feedContent = require("./content.json");
var AttributeEvaluator = require("../attribute-evaluator");

var defaultOpts = {
    feedLoader: {
        JSONPCallback: null,
        entriesPerPage: 5,
        interpolate: /{{([\s\S]+?)}}/g,
        templates: {
            pager: require("./jade-components/feed-pager.jade"),
            entry: require("./jade-components/feed-entry.jade"),
            results: require("./jade-components/feed-results.jade"),
            feed: require("./jade-components/feed.jade")
        },
        transforms: {
            entry: function(el){
                return el;
            },
            feed: function(el){
                return el;
            },
            pager: function(el) {
                var self = this;
                var nextEl = el.query("." + classNames.pagerNext);
                nextEl.addEventListener("click", function(e){
                    self.advance(1);
                    e.preventDefault();
                });
                var prevEl = el.query("." + classNames.pagerPrev);
                prevEl.addEventListener("click", function(e){
                    self.advance(-1);
                    e.preventDefault();
                });
                return el;
            }
        },
        extractNumResults: function(response) {
            return response.length;
        },
        defaultQuery: null
    }
};

var classNames = {
    feed: "tf-feed",
    entries: "tf-entries",
    entry: "tf-feed-entry",
    controls: "tf-controls",
    loading: "tf-loading",
    pager: "tf-pager",
    pagerNext: "tf-pager-next",
    pagerPrev: "tf-pager-prev"
};

var feedLoaders = {};


function generateKey(str) {
    var hashStr = hash(str);
    var offset = 0;
    while(feedLoaders[hashStr]) {
        hashStr = hash(str + offset);
        ++offset;
    }
    return hashStr;
}

var attributeEval = new AttributeEvaluator()
    .addContext("feed")
    .addContext("feedContent", {
        object: feedContent
    })
    .addContext("streamEntry");

/**
 * @description
 * Object for loading entries from a feed.
 *
 * @param {object} opts Object literal containing options
 * @param {string} opts.url URL to fetch entries from. Should contain string interpolation fields for query, offset and limit.
 * @param {integer} [opts.entriesPerPage] Number of entries loaded per page.
 * @param {regex} [opts.interpolate] String interpolation method used on URL.
 * @param {string} [opts.JSONPCallback] Set to use JSONP when fetching from endpoint. Specifies callback name to send with request.
 * @param {function} [opts.extractNumResults] Function that should return the number of results in the dataset.
 * @param {function} [opts.extractEntries] Function that should return an array of entries from reponse data.
 * @param {function} [opts.defaultQuery] Query that will be searched when feed initializes.
 * @param {function} [opts.templates] Template overrides.
 * @param {function} [opts.templates] DOM Element transforms/overrides corresponding to templates of same names. All should accept and return elements.
 */
function FeedLoader(opts) {
    EventEmitter.call(this);
    opts = defaults(opts || {}, defaultOpts.feedLoader);
    //required
    this.url = opts.url;
    this.key = generateKey(this.url);
    //optional
    this.JSONPCallback = opts.JSONPCallback;
    this.entriesPerPage = opts.entriesPerPage;
    this.interpolate = opts.interpolate;
    this.extractNumResults = opts.extractNumResults;
    this.extractEntries = opts.extractEntries;
    this.defaultQuery = opts.defaultQuery;
    this.templates = opts.templates;
    this.transforms = opts.transforms;
    //internal
    this.resultsCount = 0;
    this.currentPageIndex = 0;
    this.currentQuery = null;
    this.numPages = 0;
    this.isInit = false;

    if (this.JSONPCallback) {
        window["receiveJSON" + this.key] = FeedLoader.prototype.receiveJSON.bind(this);
    }
    feedLoaders[this.key] = this;
}

FeedLoader.prototype.receiveJSON = function(data) {
    if (this.el) {
        this.el.classList.remove(classNames.loading);
        this.resultsCount = this.extractNumResults(data);
        this.numPages = Math.ceil(this.resultsCount / this.entriesPerPage);

        attributeEval.run("feed", {
            baseEl: this.el,
            object: this
        });
        attributeEval.run("feedContent", {
            baseEl: this.el
        });
        this.parseEntries(this.extractEntries ? this.extractEntries(data) : data);
    }
    this.dispatchEvent(new CustomEvent("loadentries", {
        detail: data
    }));
};

FeedLoader.prototype.query = function(query) {
    if (query && query !== this.currentQuery) {
        this.currentQuery = query;
        this.currentPageIndex = 1;

        this.load(supplant(this.url, {
            offset: 0,
            limit: this.entriesPerPage,
            query: this.currentQuery
        }, this.interpolate));
        this.dispatchEvent(new CustomEvent("query", {
            detail: query
        }));
    }
};

FeedLoader.prototype.load = function(url) {
    if (this.el) {
        this.el.classList.add(classNames.loading);
    }
    if (this.JSONPCallback) {
        url += "&" + this.JSONPCallback + "=receiveJSON" + this.key;
        var tag = document.createElement("script");
        tag.src = url;
        document.getElementsByTagName("head")[0].appendChild(tag);
    } else {
        var self = this;
        get(url).then(function(response) {
            self.receiveJSON(JSON.parse(response));
        }, function(error) {
            console.error("Request failed:", error);
        });
    }
};

FeedLoader.prototype.goToPage = function(pageIndex) {
    pageIndex = Math.max(1, Math.min(pageIndex, this.numPages));
    if (this.currentPageIndex !== pageIndex) {
        this.currentPageIndex = pageIndex;
        this.load(supplant(this.url, {
            offset: (this.currentPageIndex - 1) * this.entriesPerPage,
            limit: this.entriesPerPage,
            query: this.currentQuery
        }, this.interpolate));
    }
    this.currentPageIndex = pageIndex || this.currentPageIndex;
};

FeedLoader.prototype.advance = function(numPages) {
    this.goToPage(this.currentPageIndex + numPages);
};

FeedLoader.prototype.init = function() {
    if (!this.isInit) {
        if (this.defaultQuery) {
            this.query(this.defaultQuery);
        }
        this.isInit = true;
    }
};

FeedLoader.prototype.parseTemplate = function(templateName, locals) {
    return this.transforms[templateName] ? this.transforms[templateName].call(this, parseHTML(this.templates[templateName](locals))) : parseHTML(this.templates[templateName](locals));
};

FeedLoader.prototype.buildEl = function(el) {
    var el = this.parseTemplate("feed");
    var results = this.parseTemplate("results");
    var pager = this.parseTemplate("pager");

    var controls = el.query("." + classNames.controls);
    controls.append(results);
    controls.append(pager);

    return el;
};

FeedLoader.prototype.parseEntries = function(entries) {
    if (Array.isArray(entries)) {
        var self = this;
        var entriesEl = this.el && this.el.query("." + classNames.entries);
        if (entriesEl) {
            entriesEl.innerHTML = "";
            entries.forEach(function(entry){
                var entryEl = self.parseTemplate("entry", entry);
                entriesEl.appendChild(entryEl);
                attributeEval.run("streamEntry", {
                    baseEl: entryEl,
                    object: entry
                });
            });
            attributeEval.run("feedContent", {
                baseEl: entriesEl,
                object: feedContent
            });
        }
    } else {
        console.error("In parseEntries: expected array but got ", typeof entries);
    }
};

FeedLoader.prototype.initInto = function(el) {
    this.init();
    if (!this.el) {
        this.el = this.buildEl();
    }
    return el.append(this.el);
};

extend(EventEmitter, FeedLoader); //sets up feedloader as an event target

module.exports = FeedLoader;
