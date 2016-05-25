module.exports = function(str) {
  var tmp = document.implementation.createHTMLDocument("");
  tmp.body.innerHTML = str;
  return tmp.body.children.length == 1 ? tmp.body.children[0] : tmp.body.children;
};
