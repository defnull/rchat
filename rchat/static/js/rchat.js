(function(){

rchat = {}

rchat.ChatApp = function(conf) {
    var self  = this;
    self.conf = conf;

    rchat.mixin.EventMixin(this);

    var conn = new rchat.model.WSClient(self.conf.websocket);
    var auth = new rchat.model.AuthModel(conn);
    var chat = new rchat.model.ChatModel(conn);

    var status_led = new rchat.gui.StatusLED();
    var login_form = new rchat.gui.LoginForm();



    self.start = function() {
        show_status_led();
        conn.bind('socket.connect', ask_for_login)
        conn.connect()
    }

    show_status_led = function() {
        status_led.off()
        status_led.show()
        conn.bind('socket.connect', function(){status_led.on()})
        conn.bind('socket.error', function(){status_led.error()})
        conn.bind('socket.close', function(){status_led.off()})
    }

    ask_for_login = function() {
        login_form.bind('login', auth.login, auth)
        login_form.bind('register', auth.register, auth)

        auth.bind('login.ok', function() {
            login_form.hide()
        })
        auth.bind('login.failed', function() {
            login_form.show_error('Login failed. Try again.')
        })
        auth.bind('register.ok', function() {
            login_form.hide()
        })
        auth.bind('register.failed', function() {
            login_form.show_error('Either the e-mail is connected to an existing account, or your password was to short.')
        })            
        login_form.show()
    }

}



})();
