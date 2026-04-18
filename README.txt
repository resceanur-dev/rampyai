rampyai free

Retro iOS 6-style chat website using a compatible AI agent endpoint.

How it works:
- run the local Node server
- point the Agent URL at a compatible endpoint
- messages are proxied through the server

Suggested setup:
- Ollama or another local OpenAI-compatible endpoint
- default Agent URL: http://localhost:11434/v1
- if you use Ollama native mode, set the URL to http://localhost:11434/api

OpenRouter setup:
- set Agent URL to https://openrouter.ai/api/v1
- paste the OpenRouter API key into the settings screen or set OPENROUTER_API_KEY on the server
- example free model: meta-llama/llama-3.1-8b-instruct:free
- the app now runs a startup connectivity check

If it fails:
- the chat will now show the HTTP code and response body
- if you opened the HTML file directly, use the local server at http://localhost:3000/
- if OpenRouter returns 404, check the model name and Server URL

Run:
- npm install
- npm start

GitHub:
- this repo is ready to push to GitHub
- keep `OPENROUTER_API_KEY` out of the repo
