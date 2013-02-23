from rchat.web import make_server
from rchat.chat import Server, db

db.add_user('test@example.com','rchatpwd')

chat = Server()
make_server(chat).serve_forever()
