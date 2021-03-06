//simple EventTarget implementation from MDN: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
var EventTarget = function() {
this.listeners = {};
};

EventTarget.prototype.listeners = null;
EventTarget.prototype.addEventListener = function(type, callback){
  if(!(type in this.listeners)) {
    this.listeners[type] = [];
  }
 this.listeners[type].push(callback);
};

EventTarget.prototype.removeEventListener = function(type, callback){
  if(!(type in this.listeners)) {
    return;
  }
  var stack = this.listeners[type];
  for(var i = 0, l = stack.length; i < l; i++){
     if(stack[i] === callback){
       stack.splice(i, 1);
       return this.removeEventListener(type, callback);
      }
     }
};

EventTarget.prototype.dispatchEvent = function(event){
  if(!(event.type in this.listeners)) {
    return;
  }
    var stack = this.listeners[event.type];
    event.target = this;
    for(var i = 0, l = stack.length; i < l; i++) {
        stack[i].call(this, event);
    }
};
module.exports = EventTarget;
