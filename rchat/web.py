import os
from bottle import Bottle, request, abort, static_file
from gevent.pywsgi import WSGIServer
from geventwebsocket import WebSocketHandler, WebSocketError


class ConnectionClosed(IOError): pass


class WebSocketConnection(object):
    def __init__(self, ws):
        self.websocket = ws

    def send(self, event):
        try:
            self.websocket.send(event.to_json())
        except:
            self.websocket.close()
            raise ConnectionClosed()

    def receive(self):
        data = self.websocket.receive()
        if not data:
            self.websocket.close()
            raise ConnectionClosed()
        return Event.from_json(data)

    def error(self, code, desc):
        try:
            err = Event('error', code=code, message=desc )
            self.websocket.send(err.to_json())
        except:
            pass
        finally:
            self.close()

    def close(self):
        self.websocket.close()


def make_server(chat, host="0.0.0.0", port=8080):
    app = Bottle()
    server = WSGIServer((host, port), app, handler_class=WebSocketHandler)

    @app.route('/')
    def handle_index():
        return static_file('static/index.html', root=os.path.dirname(__file__))

    @app.route('/static/<fname:path>')
    def handle_jscript(fname):
        return static_file(fname, root=os.path.dirname(__file__)+'/static/')

    @app.route('/api/<query>')
    def api_call(query):
        try:
            return chat.api_call(query, request.json)
        except APIError, e:
            return {'error': repr(e)}
        return static_file(fname, root=os.path.dirname(__file__)+'/static/')


    @app.route('/websocket')
    def handle_websocket():
        wsock = request.environ.get('wsgi.websocket')
        if not wsock:
            abort(400, 'Expected WebSocket request')
        conn = WebSocketConnection(wsock)
        try:
            chat.serve(conn) # This blocks
        finally:
            wsock.close()

    return server

from rchat.chat import Event
