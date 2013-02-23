(function(){


rchat.mixin = {}

rchat.mixin.EventMixin = function(self) {
    /* Event management
       TODO: A way to delegate/forward events
    */
    if (self.events) return;
    self.event = {}

    self.bind = function(name, callback, context) {
        if(context) callback = jQuery.proxy(callback, context)
        if(! self.event.hasOwnProperty(name)) {
            self.event[name] = [];
        }
        self.event[name].push(callback);
        return callback
    }
    
    self.once = function(name, callback, context) {
        callback = self.bind(name, callback, context)
        self.bind(name, function() {
            self.unbind(name, callback)
        })
        return callback
    }

    self.unbind = function(name, callback) {
        if(! self.event.hasOwnProperty(name)) return;
        var index = self.event[name].indexOf(callback);
        if(index!=-1) self.event[name].splice(index, 1);
    }

    self.trigger = function(name) {
        var args = Array.prototype.slice.call(arguments);
        var name = args.shift()
        console.log('Event', name, args, self)
        var event_list = self.event[name];
        if(event_list) {
            for(var i=0, len=event_list.length; i < len; i++) {
                event_list[i].apply(null, args)
            }
        }
    }
}


rchat.mixin.ViewMixin = function(self, node_id) {
    if (self.dom) return;

    rchat.mixin.EventMixin(self);

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
