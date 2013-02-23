(function() {

rchat.util = {}


var idc = 1;

rchat.util.get_uid = function(node) {
    var id = 'rchat-auto-'+(idc++);
    if(node) node.attr('id', id)
    return id
}


rchat.util.load_tpl = function(name, args) {
    var cname = 'rchat-tpl-'+name;
    var node = jQuery('.'+cname).clone().removeClass(cname)
    return node.html(node.html().replace(/\{\{([A-Za-z]+)\}\}/g, function(_, match) {
        return args[match]
    }))
}


rchat.util.text_to_html = function(text) {
    var lookup = new Array();
    var hash = function(text) {
        return '~'+(lookup.push(text)-1)+'~';
    }

    // Escape tilde, so we can use it as a hash-identifier
    text = text.replace('~','~T');

    text = text.replace(/\*\*(.+?)\*\*/g, function(_,inner){
        return hash('<b>'+text_to_html(inner)+'</b>');
    })
    text = text.replace(/\*([^*]+)\*/g, function(_,inner){
        return hash('<i>'+text_to_html(inner)+'</i>');
    })
    text = text.replace(/\[([^ \]]+)( [^\]]+)?\]/g, function(_,url,name){
        if(name)
            return hash('<a href="'+url+'">'+name+'</a>');
        else
            return hash('<a href="'+url+'">'+url+'</a>');
    })

    text = text.replace(/~([0-9]+)~/g, function(){
        id = parseInt(arguments[1]);
        return lookup[id]
    })
    text = text.replace('~T','~')
    return text
}


})();