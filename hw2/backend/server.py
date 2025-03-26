from flask import Flask, request, Response
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)


@app.errorhandler(404)
def not_found_error(error):
    return Response(json.dumps({"error": "Not Found"}), status=404, mimetype='application/json')


@app.errorhandler(400)
def bad_request_error(error):
    return Response(json.dumps({"error": "Bad Request"}), status=400, mimetype='application/json')


@app.errorhandler(500)
def internal_error(error):
    return Response(json.dumps({"error": "Internal Server Error"}), status=500, mimetype='application/json')


WEB_SERVICE_1_URL = "http://127.0.0.1:8000"
GEMINI_API_KEY = ''
GEMINI_URL = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}'


def forward_request(endpoint, method, data=None, params=None):
    url = WEB_SERVICE_1_URL + endpoint
    headers = {'Content-Type': 'application/json'}
    try:
        resp = requests.request(
            method, url, headers=headers, json=data, params=params, timeout=5)
        return Response(resp.content, status=resp.status_code, mimetype='application/json')
    except requests.exceptions.Timeout:
        error_message = {
            "error": "The service is currently unavailable (timeout). Please try again later."}
        return Response(json.dumps(error_message), status=503, mimetype='application/json')
    except requests.exceptions.ConnectionError:
        error_message = {
            "error": "Failed to connect to the service. Please ensure the service is running."}
        return Response(json.dumps(error_message), status=503, mimetype='application/json')
    except requests.exceptions.RequestException as e:
        error_message = {"error": f"An error occurred: {str(e)}"}
        return Response(json.dumps(error_message), status=503, mimetype='application/json')
    except Exception as e:
        error_message = {
            "error": "An unexpected error occurred while contacting the service."}
        return Response(json.dumps(error_message), status=503, mimetype='application/json')


@app.route('/favicon.ico')
def favicon():
    return "", 204


@app.route('/books', methods=['GET', 'POST', 'PUT', 'DELETE'])
def books():
    if request.method == 'GET':
        return forward_request('/books', 'GET', params=request.args)
    elif request.method == 'POST':
        data = request.get_json()
        return forward_request('/books', 'POST', data=data)
    elif request.method == 'PUT':
        data = request.get_json()
        return forward_request('/books', 'PUT', data=data)
    elif request.method == 'DELETE':
        return forward_request('/books', 'DELETE')


@app.route('/books/<book_id>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def book_detail(book_id):
    endpoint = f'/books/{book_id}'
    headers = {'Content-Type': 'application/json'}

    if request.method == 'GET':
        try:
            resp1 = requests.get(WEB_SERVICE_1_URL +
                                 endpoint, headers=headers, timeout=5)
            resp1.raise_for_status()
            book_data = resp1.json()
        except requests.exceptions.HTTPError as http_err:
            status = http_err.response.status_code
            reason = http_err.response.reason
            error_message = {"error": f"{status} {reason}"}
            return Response(json.dumps(error_message), status=status, mimetype='application/json')
        except requests.exceptions.Timeout:
            error_message = {
                "error": "503 The service is currently unavailable (timeout). Please try again later."}
            return Response(json.dumps(error_message), status=503, mimetype='application/json')
        except requests.exceptions.ConnectionError:
            error_message = {
                "error": "503 Failed to connect to the service. Please ensure the service is running."}
            return Response(json.dumps(error_message), status=503, mimetype='application/json')
        except Exception as e:
            error_message = {
                "error": "503 An unexpected error occurred while contacting the service."}
            return Response(json.dumps(error_message), status=503, mimetype='application/json')

        book_data.setdefault("title", "Unknown")
        book_data.setdefault("author", "Unknown")
        book_data.setdefault("year_published", "Unknown")
        book_data.setdefault("genre", "Unknown")
        book_data.setdefault("pages", "Unknown")

        prompt = f"Provide a concise summary for the book titled: {book_data.get('title', '')}"
        gemini_body = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        try:
            gemini_resp = requests.post(
                GEMINI_URL, headers=headers, json=gemini_body, timeout=5)
            if gemini_resp.status_code == 200:
                gemini_data = gemini_resp.json()
                summary = gemini_data['candidates'][0]['content']['parts'][0]['text']
            else:
                summary = f"{gemini_resp.status_code} {gemini_resp.reason} - There was a problem accessing the Gemini service at the moment."
        except Exception:
            summary = "There was a problem accessing the Gemini service at the moment."
        book_data['summary'] = summary

        author = book_data.get('author', '')
        wiki_params = {
            'action': 'query',
            'format': 'json',
            'prop': 'extracts',
            'exintro': 'true',
            'titles': author
        }
        wiki_url = "https://en.wikipedia.org/w/api.php"
        try:
            wiki_resp = requests.get(
                wiki_url, headers=headers, params=wiki_params, timeout=5)
            if wiki_resp.status_code == 200:
                wiki_data = wiki_resp.json()
                pages = wiki_data.get('query', {}).get('pages', {})
                if pages:
                    page = next(iter(pages.values()))
                    full_extract = page.get('extract', 'No extract available.')
                    author_extract = full_extract
                elif author_extract == "":
                    author_extract = "No extract available."
                else:
                    author_extract = "No extract available."
            else:
                author_extract = f"{wiki_resp.status_code} {wiki_resp.reason} - There was a problem accessing the Wikipedia service at the moment."
        except Exception:
            author_extract = "There was a problem accessing the Wikipedia service at the moment."
        book_data['author_info'] = author_extract

        return Response(json.dumps(book_data), status=200, mimetype='application/json')

    elif request.method == 'POST':
        data = request.get_json()
        return forward_request(endpoint, 'POST', data=data)
    elif request.method == 'PUT':
        data = request.get_json()
        return forward_request(endpoint, 'PUT', data=data)
    elif request.method == 'DELETE':
        return forward_request(endpoint, 'DELETE')


if __name__ == '__main__':
    app.run(port=8001, debug=False, threaded=True)
