// simple string interpolation based on Crockford's supplant method from remedial JS
// http://javascript.crockford.com/remedial.html
module.exports = function (str, o, interpolate) {
    return str.replace(interpolate || /\{([^{}]*)\}/g,
        function (a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
};
