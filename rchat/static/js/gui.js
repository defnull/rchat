(function(){

rchat.gui = {}

rchat.gui.StatusLED = function() {
    rchat.mixin.ViewMixin(this, '#rchat-status-led')

    var self = this;
    self.dom.children().hide()

    self.off = function() {
        self.dom.children().hide()
        self.dom.find(':nth-child(1)').show()
    }
    self.on = function() {
        self.dom.children().hide()
        self.dom.find(':nth-child(2)').show()
    }
    self.error = function() {
        self.dom.children().hide()
        self.dom.find(':nth-child(3)').show()
    }
}


rchat.gui.LoginForm = function() {
    rchat.mixin.ViewMixin(this, '#rchat-login');

    var self = this;
    var action = 'login';
    var form = self.dom.find('form');

    form.find('button').click(function() {
        action = jQuery(this).attr('name');
    });

    form.submit(function(e){
        e.preventDefault()
        var email    = form.find('input[name="email"]').val()
        var pass     = form.find('input[name="password"]').val()
        if(action === 'login')
            self.trigger('login', email, pass);
        else
            self.trigger('register', email, pass);
    })

    self.show_error = function(msg) {
        var node = self.dom.find('.alert');
        node.text(msg).show()
    }
}


})();
