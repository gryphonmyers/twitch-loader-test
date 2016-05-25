require("dom4");
var defaults = require("lodash/defaultsDeep");
var omit = require("lodash/omit");
var supplant = require("../string-supplant");

var defaultOpts = {
    attrEvaluator: {
        interpolate: /{{([\s\S]+?)}}/g,
        attrNames: {
            content: "data-content",
            src: "data-src",
            html: "data-html",
            href: "data-href",
            placeholder: "data-placeholder"
        },
        attrActions: {
            content: function(el, val) {
                el.textContent = val;
            },
            src: function(el, val) {
                el.src = val;
            },
            html: function(el, val) {
                el.innerHTML = val;
            },
            href: function(el, val) {
                el.href = val;
            },
            placeholder: function(el, val) {
                el.placeholder = val;
            }
        }
    }
};
var contextAttr = "data-context";

function AttributeEvaluator(opts) {
    opts = defaults(opts || {}, defaultOpts.attrEvaluator);
    this.contexts = {};
    this.actions = {};
    for (var attrKey in opts.attrNames) {
        var attrName = opts.attrNames[attrKey];
        this.addAction(attrName, opts.attrActions[attrKey]);
    }
};

AttributeEvaluator.prototype.addContext = function(contextKey, opts) {
    opts = opts || {};

    this.contexts[contextKey] = {
        baseEl: opts.baseEl,
        object: opts.object,
        disabledAttrs: opts.disabledAttrs
    };
    return this;
};

AttributeEvaluator.prototype.addAction = function(attrName, func) {
    this.actions[attrName] = func;
};

AttributeEvaluator.prototype.run = function(contextKey, opts) {
    opts = opts || {};
    var self = this;
    var context = this.contexts[contextKey];
    if (context) {
        var actions = omit(this.actions, context.disabledAttrs);
        var baseEl = opts.baseEl || context.baseEl || document;
        var object = opts.object || context.object || window;
        baseEl.queryAll("[" + contextAttr + "=" + contextKey + "]").forEach(function(el){
            for (var attrName in actions) {
                if (el.hasAttribute(attrName)) {
                    self.executeAction(attrName, el, object, opts.locals);
                }
            }
        });

    } else {
        console.warn("Context does not exist: ", contextKey);
    }
};

AttributeEvaluator.prototype.executeAction = function(attrName, el, contextObj, locals) {
    var attrVal = supplant(el.getAttribute(attrName), locals, this.interpolate);
    var func = new Function("return " + attrVal + ";");
    try {
        var result = func.call(contextObj, locals);
    } catch(err) {
        console.error("Attribute evaluation failed: ", err);
    } finally {
        this.actions[attrName].call(this, el, result);
    }
};

module.exports = AttributeEvaluator;
