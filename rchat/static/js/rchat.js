(function(){

rchat = {}

rchat.ChatApp = function(conf) {
    var self  = this;
    self.conf = conf;

    rchat.mixin.EventMixin(this);
    this.add_events();

    var conn = new rchat.model.WSClient(self.conf.websocket);
    var status_led = new rchat.gui.StatusLED();
    var login_form = new rchat.gui.LoginForm();

    self.start = function() {
        status_led.off()
        status_led.show()
        conn.bind('socket.connect', function(){status_led.on()})
        conn.bind('socket.error', function(){status_led.error()})
        conn.bind('socket.close', function(){status_led.off()})

        conn.bind('socket.connect', ask_for_login)
        conn.connect()
    }

    ask_for_login = function() {
        login_form.show()

        login_form.bind('login', function(email, pass) {
            conn.send('auth', {'email': email, 'password': pass})
        })

        login_form.bind('register', function(email, pass) {
            conn.send('register', {'email': email, 'password': pass})
        })

        conn.bind('auth.ok', function() {
            login_form.hide()
        })

        conn.bind('auth.failed', function() {
            login_form.show_error('Login failed. Try again.')
        })

        conn.bind('register.ok', function() {
            login_form.hide()
            self.trigger('')
        })

        conn.bind('register.failed', function() {
            login_form.show_error('Either the e-mail is connected to an existing account, or your password was to short.')
        })            
    }

}



})();
