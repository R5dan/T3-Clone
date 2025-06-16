import requests as r

url = "localhost:3000/api/chat"
r.post(url, json={"prompt": "Hello, how are you?"})