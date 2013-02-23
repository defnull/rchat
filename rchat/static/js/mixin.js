(function(){


rchat.mixin = {}

rchat.mixin.EventMixin = function(self) {
    /* Event management */
    if (self.events) return;
    self.events = {}

    self.add_events = function() {
        for (var i = 0; i < arguments.length; i++) {
            var name = arguments[i];
            if(self.events.hasOwnProperty(name)) {
                throw "Adding event failed: Colliding with "+event;
            }
            self.events[arguments[i]] = [];
        }
    }

    self.bind = function(name, callback, context) {
        if(context) callback = jQuery.proxy(callback, context)
        if(! self.events.hasOwnProperty(name)) {
            throw "Unsupported event: "+name;
        }
        self.events[name] = self.events[name] || [];
        self.events[name].push(callback);
    }

    self.trigger = function(name) {
        var args = Array.prototype.slice.call(arguments);
        console.log(self, arguments)
        var name = args.shift()
        var event_list = self.events[name];
        if(event_list) {
            for(var i=0, len=event_list.length; i < len; i++) {
                if(event_list[i].apply(null, args) === false) {
                    event_list.splice(i, 1);
                    i--;
                }
            }
        }
    }
}


rchat.mixin.ViewMixin = function(self, node_id) {
    if (self.dom) return;

    rchat.mixin.EventMixin(self);
    self.add_events('gui.show', 'gui.hide', 'gui.remove');

    self.dom = jQuery(node_id);

    self.show = function() {
        self.dom.fadeIn()
        self.trigger('gui.show')
    }
    self.hide = function() {
        self.dom.fadeOut()
        self.trigger('gui.hide')
    }
    self.remove = function() {
        self.dom.remove()
        self.trigger('gui.remove')
    }
}


rchat.mixin.ModelMixin = function(self) {
    rchat.mixin.EventMixin(self);
}

})();