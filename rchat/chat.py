import os
from json import dumps as json_encode, loads as json_decode
from rchat.web import ConnectionClosed
import uuid
import gevent
import time
from json import dumps as json_encode, loads as json_decode
import hmac, hashlib

def hash(msg):
    key = 'verysecretkeythatshouldnotgetinwronghandsandneverchangebecausethatwouldrenderallpasswordsuseless'
    return hmac.new(key, msg, hashlib.sha256).hexdigest()

import sqlite3 as sqlite
class DBError(Exception): pass
class AuthError(DBError): pass
class RegisterError(DBError): pass

import logging
log = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

class Model(object):
    def __init__(self):
        self.db = sqlite.connect(':memory:')
        with self.db:
            c = self.db.cursor()
            c.execute('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT)')

    def add_user(self, email, password):
        with self.db:
            if len(password) < 8:
                raise RegisterError('Password to short.')
            phash = hash(password)
            try:
                c = self.db.cursor()
                c.execute('INSERT INTO users VALUES (NULL,?,?)', (email, phash))
                self.db.commit()
                log.info('New account: %s' % email)
            except sqlite.IntegrityError:
                self.db.rollback()
                raise RegisterError('Email used')

    def login_user(self, email, password):
        with self.db:
            c = self.db.cursor()
            phash = hash(password)
            c.execute('SELECT id FROM users WHERE email=? AND password=?', (email, phash))
            x = c.fetchone()
            return x[0] if x else None

db = Model()





class Event(dict):
    def __init__(self, *a, **ka):
        self.name = a[0]
        self.update(*a[1:], **ka)

    @classmethod
    def from_json(cls, data):
        data = json_decode(data)
        name = data.pop('name')
        data = data.pop('data')
        return cls(name, data)

    def to_json(self):
        return json_encode({
            'name': self.name,
            'data': self
        })

    __getattr__ = dict.get



class Server(object):

    def __init__(self):
        self.running = True
        self.sessions = {}

    def serve(self, conn):
        e = conn.receive()
        if e.name == 'CONNECT':
            session = Session(self)
            session.push_handler(LoginHandler())
        elif e.name == 'RECONNECT':
            session = self.sessions.pop(msg['uuid'], None)

        if not session: return

        self.sessions[session.uuid] = session
        session.serve(conn)



class Session(object):
    def __init__(self, server):
        self.server  = server
        self.conn    = None
        self.buffer  = []
        self.handler = []
        self.uuid = str(uuid.uuid4())

    def __hash__(self):
        return hash(self.uuid)

    def serve(self, conn):
        is_reconnect = bool(self.conn)
        if self.conn: self.conn.close()
        self.conn = conn
        self.send('HELLO', uuid=self.uuid, server_time=time.time())

        while self.conn:
            e = self.conn.receive()
            for handler in self.handler[::-1]:
                if handler.handle(e) == False: break

    def push_handler(self, h):
        h.session = self
        h.server  = self.server
        h.init()
        self.handler.append(h)

    def pop_handler(self, h):
        return self.handler.pop()

    def send(self, event, **data):
        self.buffer.append(Event(event, **data))
        while self.buffer:
            event = self.buffer.pop()
            try:
                self.conn.send(event)
            except ConnectionClosed:
                self.buffer.append(event)
                return False
        return True

    def send_error(self, code, desc, msg=None, **data):
        if msg and msg.msgid:
            self.send('ERROR', msgid=msg.msgid, code=code, desc=desc, **data)
        else:
            self.send('ERROR', code=code, desc=desc, **data)



class BaseHandler(object):
    def __init__(self):
        self.callbacks = {}
        for name in dir(self):
            if name.startswith('on_'):
                self.callbacks[name[3:]] = getattr(self, name)

    def handle(self, e):
        cb = self.callbacks.get(e.name)
        if cb:
            return cb(e)

    def send(self, *a, **ka):
        self.session.send(*a, **ka)

    def init(self): pass




class LoginHandler(BaseHandler):
    def init(self):
        self.account = None
        self.session.auth = self

    def on_login(self, msg):
        if self.account: return
        login     = msg.get('login')
        password = msg.get('password')
        user = db.login_user(login, password)
        if user:
            self.account = user
            self.send('login.ok')
            self.session.push_handler(ChatHandler())
        else:
            self.send('login.failed')

    def on_register(self, msg):
        if self.account: return
        email    = msg.get('email')
        password = msg.get('password')
        try:
            db.add_user(email, password)
            self.account = email
            self.send('register.ok')
            self.session.push_handler(ChatHandler())
        except RegisterError, e:
            self.send('register.failed', desc=e.args[0])



class ChatHandler(BaseHandler):
    def init(self):
        self.session.chat = self
        self.rooms = []
        self.send('chat.init')

    def on_join(self, msg):
        if not self.session.auth.account: return
        room    = msg.get('room')
        roomset = self.rooms.setdefault(room, set())
        if sess not in roomset:
            roomset.add(sess)
            for session in roomset:
                session.send('join', room=room, user=session.auth)

    def on_message(self, msg):
        if not self.session.auth.account: return
        room = self.rooms.get(msg.room)
        if sess not in room: return
        for session in room:
            session.send('message', room=msg.room, user=self.auth, text=msg.text)

    def on_ping(self, msg):
        self.session.send('pong')





