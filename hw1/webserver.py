from http.server import HTTPServer, BaseHTTPRequestHandler
from bson.objectid import ObjectId
from pymongo import MongoClient
import json
import re

id_pattern = re.compile(r'/books/([0-9a-fA-F]{24})')

BOOK = {
    'title': str,
    'author': str,
    'year_published': int,
    'genre': str,
    'pages': int
}

uri = 'mongodb://localhost:27017'
client = MongoClient(uri)
db = client.get_database('library')
books = db.get_collection('books')


class ExtendedRequestHandler(BaseHTTPRequestHandler):
    def send_json_error(self, code, message):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        error = json.dumps({'error': message})
        self.wfile.write(error.encode())

    def do_GET(self):
        if self.path == '/books':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            query = list(books.find({}))
            query = json.dumps(query, default=str)
            self.wfile.write(query.encode())

        elif id_pattern.match(self.path):
            query = books.find_one({'_id': ObjectId(self.path.split('/')[-1])})
            if query is None:
                self.send_json_error(404, 'Not Found')
                return

            query = json.dumps(query, default=str)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            self.wfile.write(query.encode())

        else:
            self.send_json_error(404, 'Not Found')

    def do_POST(self):
        if self.path == '/books':
            try:
                content_length = int(self.headers['Content-Length'])
                body = self.rfile.read(content_length)
                body = json.loads(body)
            except:
                self.send_json_error(400, 'Bad Request')
                return

            if not isinstance(body, dict):
                self.send_json_error(400, 'Bad Request')
                return

            keys_match = set(body.keys()) == set(BOOK.keys())
            types_match = all(type(body[key]) == BOOK[key] for key in body)
            if not keys_match or not types_match:
                self.send_json_error(400, 'Bad Request')
                return

            query = books.insert_one(body)
            message = {'_id': str(query.inserted_id)}
            message = json.dumps(message)

            self.send_response(201)
            self.end_headers()
            self.wfile.write(message.encode())

        elif id_pattern.match(self.path):
            query = books.find_one({'_id': ObjectId(self.path.split('/')[-1])})
            if query is not None:
                self.send_json_error(409, 'Conflict')
                return

            self.send_json_error(404, 'Not Found')

        else:
            self.send_json_error(404, 'Not Found')

    def do_PUT(self):
        if self.path == '/books':
            try:
                content_length = int(self.headers['Content-Length'])
                body = self.rfile.read(content_length)
                body = json.loads(body)
            except:
                self.send_json_error(400, 'Bad Request')
                return

            if not isinstance(body, list):
                self.send_json_error(400, 'Bad Request')
                return

            for book in body:
                if '_id' not in book.keys():
                    self.send_json_error(400, 'Bad Request')
                    return
                if not ObjectId.is_valid(book['_id']):
                    self.send_json_error(400, 'Bad Request')
                    return
                keys = set(book.keys())
                keys.remove('_id')
                keys_match = keys == set(BOOK.keys())
                types_match = all(type(book[key]) == BOOK[key] for key in keys)
                if not keys_match or not types_match:
                    self.send_json_error(400, 'Bad Request')
                    return

            book_ids = {book['_id'] for book in body}
            if len(set(book_ids)) != len(book_ids):
                self.send_json_error(400, 'Bad Request')
                return

            existing_books = {str(b['_id']): b for b in books.find(
                {'_id': {'$in': [ObjectId(id) for id in book_ids]}})}
            for book in body:
                book_id = book['_id']
                book['_id'] = ObjectId(book_id)
                if book_id in existing_books:
                    books.update_one(
                        {'_id': ObjectId(book_id)}, {'$set': book})
                else:
                    books.insert_one(book)

            books.delete_many(
                {'_id': {'$nin': [ObjectId(id) for id in book_ids]}})

            self.send_response(204)
            self.end_headers()

        elif id_pattern.match(self.path):
            try:
                content_length = int(self.headers['Content-Length'])
                body = self.rfile.read(content_length)
                body = json.loads(body)
            except:
                self.send_json_error(400, 'Bad Request')
                return
            if not isinstance(body, dict):
                self.send_json_error(400, 'Bad Request')
                return
            keys_match = set(body.keys()) == set(BOOK.keys())
            types_match = all(type(body[key]) == BOOK[key] for key in body)
            if not keys_match or not types_match:
                self.send_json_error(400, 'Bad Request')
                return
            query = books.update_one(
                {'_id': ObjectId(self.path.split('/')[-1])}, {'$set': body})
            if query.matched_count == 0:
                self.send_json_error(404, 'Not Found')
                return
            self.send_response(204)
            self.end_headers()

        else:
            self.send_json_error(404, 'Not Found')

    def do_DELETE(self):
        if self.path == '/books':
            books.delete_many({})
            self.send_response(204)
            self.end_headers()

        elif id_pattern.match(self.path):
            query = books.delete_one(
                {'_id': ObjectId(self.path.split('/')[-1])})
            if query.deleted_count == 0:
                self.send_json_error(404, 'Not Found')
                return
            self.send_response(204)
            self.end_headers()

        else:
            self.send_json_error(404, 'Not Found')


def run(server_class=HTTPServer, handler_class=ExtendedRequestHandler):
    server_address = ('', 8000)
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()


run()
