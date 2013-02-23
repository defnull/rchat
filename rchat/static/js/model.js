(function(){

rchat.model = {};

rchat.model.WSClient = function(url) {
    /* A reconnecting websocket client with an event-based JSON encoded
        message protocol.
    
        TODO: AJAX api for request/response type communication
        TODO: (long-)poll fallback for browsers without websocket support (?)

    */

	rchat.mixin.ModelMixin(this)

    var socket;
    var callbacks = {};
    var send_buffer = [];
    var self = this;
    var uuid = null;
    var next_ref = 0;

    self.connect = function() {
        if(socket && socket.readyState == WebSocket.OPEN) {
            socket.close()
        }
        socket = new WebSocket(url);
        socket.onopen = function(e) {
            self.trigger('socket.connect', {})
            if(uuid) self.send('RECONNECT', {'uuid':uuid}, true)
            else     self.send('CONNECT', {}, true)
            self.flush()
        }
        socket.onerror = function(e) {
            self.trigger('socket.error', {})
        }
        socket.onclose = function(e) {
            socket = null;
            self.trigger('socket.close', {})
        }
        socket.onmessage = function(e) {
            var event = JSON.parse(e.data);
            if(!event) return;
            if(!event.name) return;
            if(!event.hasOwnProperty('data')) return;
            if(event.name === 'HELLO') {
                uuid = event.data.uuid;
            }
            self.trigger(event.name, event.data);
        }
    }

    self.flush = function() {
        while(send_buffer.length && socket && socket.readyState == WebSocket.OPEN) {
            var payload = send_buffer.shift()
            socket.send(JSON.stringify(payload));
            self.trigger('socket.sent', payload)
        }
    }

    self.send = function(event_name, event_data, priority) {
        var ref = next_ref++;
        var payload = {
            name: event_name,
            ref: ref,
            data: event_data
        }
        priority ? send_buffer.unshift(payload) : send_buffer.push(payload);
        self.flush()
        return self;
    };
};


rchat.model.AuthModel = function(conn) {
	rchat.mixin.ModelMixin(this)
    var self = this;
    self.logged_in = false;

    self.login = function(login, password) {
        conn.send('login', {login: login, password: password})
    }

    self.register = function(email, password) {
        conn.send('register', {email: email, password: password})
    }

    conn.bind('login.ok', function(e) {
        self.logged_in = true;
        self.trigger('login.ok', e)
    })

    conn.bind('login.failed', function(e) {
        self.logged_in = false;
        self.trigger('login.failed', e)
    })

    conn.bind('register.ok', function(e) {
        self.logged_in = true;
        self.trigger('register.ok', e)
    })

    conn.bind('register.failed', function(e) {
        self.logged_in = false;
        self.trigger('register.failed', e)
    })

}


rchat.model.ChatModel = function(conn) {
	rchat.mixin.ModelMixin(this)

    var self = this;
    self.conn = conn;
    self.rooms = {}
    self.identities = {}

    self.conn.bind('join', function(e) {
        self.rooms[e.room] = e
        self.trigger('room.join', e.room)
    })

    self.conn.bind('message', function(e){
        if(e.room && self.rooms[e.room]) {
            self.trigger('room.message', e)
        }
    })

    self.auth = function(login, password) {
        self.conn.send('auth', {login: login, password: password})
    }

    self.join = function(room) {
        if(self.rooms[room]) return
        self.conn.send('join', {'room': room})
    }

    self.ping = function(msg) {
        self.conn.send('ping', {'msg': msg})
    }
}













rchat.model.RoomListView = function(controller) {
    self.rooms = {};
    self.visible = null;
    self.dom = jQuery('<div />').addClass('rchat-room-list')

    controller.bind('chat.room.join', self.add_room, self)
    controller.bind('chat.room.select', self.select_room, self)
    controller.bind('chat.message', self.on_message, self)

    self.add_room = function(room) {
        var li = jQuery('<li><a href="#"></a></li>')
        var a = li.find('a')
        a.text(room)
        a.click(function(){
            controller.trigger('gui.room.select', room)
        })
        self.rooms[a] = {'link':a, 'li':li, unread:0}
        li.appendTo(self.dom)
    }

    self.del_room = function(room) {
        if(self.rooms[room]) {
            self.rooms[room].lo.remove()
            delete self.rooms[room];
        }
    }

    self.select_room = function(room) {
        if(self.visible) {
            self.visible.li.removeClass('active')
        }
        self.visible = self.rooms[room]
        self.visible.li.addClass('active')
        self.visible.unread = 0
        self.visible.a.text(room)
    }

    self.on_message = function(room) {
        var room = self.rooms[room]
        if(room === self.visible) return
        room.a.text(room+' ('+(room.unread++)+')')
    }
}





var active_room = null;





rchat.model.CharacterText = function(room, parent) {
    var self = this
    self.charselect = jQuery('\
        <div class="btn-group">\
            <button class="btn dropdown-toggle" data-toggle="dropdown">\
                Select Character\
            </button>\
            <ul class="dropdown-menu">\
                <!-- dropdown menu links -->\
            </ul>\
        </div>')

    self.textform = jQuery('\
        <form>\
            <textarea cols=2 style="width:80%"></textarea>\
        </form>')

    self.textform.find('textarea').keydown(function(e) {
        if(e.keyCode == 13) {
            e.preventDefault();
            self.textform.submit();
        }
    });

    self.add_char = function(name) {
        var li = jQuery('<li><a /></li>')
                  .appendTo(self.charselect.find('.dropdown-menu'))
        var a = li.find('a')
        a.text(name).attr('href','#').click(function(e){
            e.preventDefault();
            self.charselect.find('button:first').text(name)
        });
    }
}


rchat.model.ChatRoom = function(chat, name) {
    var self = this
    self.name = name
    self.chat = chat;

    self.new_counter = 0;

    var chatnode = jQuery('<div>').addClass('rchat-room');
    var navnode = jQuery('<li />').appendTo('#nav-open-chats');
    var navlink = jQuery('<a />').appendTo(navnode);
    var formnode = new view.CharacterText(self, chatnode)
    formnode.charselect.appendTo(chatnode)
    formnode.textform.appendTo(chatnode)
    formnode.add_char('Sewa Khan')
    formnode.add_char('Mia Levi')
    navlink.text(name)
    navlink.click(function() {
        self.show();
        return false;
    })

    self.is_active = function() {
        return !!(active_room == self)
    }

    self.show = function() {
        if(self.is_active()) return;
        if(active_room) active_room.hide();
        active_room = self;

        self.new_counter = 0
        navlink.text(self.name)

        chatnode.appendTo('#rchat-chatbox').show();
        navnode.addClass('active');
    }

    self.hide = function() {
        if(!self.is_active()) return;
        active_room = null;
        navnode.removeClass('active');
        chatnode.hide().detach();
    }

    self.add_message = function(msg) {
        var msgnode = jQuery('<div />').html(view.chattext(msg.text)).hide()
        jQuery('<b />').text(''+msg.user+': ').prependTo(msgnode)
        chatnode.append(msgnode)
        if(self.is_active()) {
            msgnode.fadeIn();
        } else {
            msgnode.show();
            self.new_counter ++;
            navlink.html('<b>'+self.name+' ('+self.new_counter+')</b>')
        }
    }
}



})();
