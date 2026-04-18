var STORAGE_PREFIX = 'rampyai.';
var messages = [];

function byId(id) {
    return document.getElementById(id);
}

function setStatus(text) {
    byId('statusText').innerHTML = text;
}

function saveSettings() {
    localStorage.setItem(STORAGE_PREFIX + 'agentURL', byId('agentURL').value);
    localStorage.setItem(STORAGE_PREFIX + 'openrouterKey', byId('openrouterKey').value);
    localStorage.setItem(STORAGE_PREFIX + 'model', byId('model').value);
    setStatus('Settings saved');
}

function saveThemePrefs() {
    localStorage.setItem(STORAGE_PREFIX + 'classicSkin', byId('classicSkin').checked ? '1' : '0');
    localStorage.setItem(STORAGE_PREFIX + 'glossyButtons', byId('glossyButtons').checked ? '1' : '0');
    localStorage.setItem(STORAGE_PREFIX + 'settingsTexture', byId('settingsTexture').checked ? '1' : '0');
    applyThemePrefs();
}

function applyThemePrefs() {
    var classicSkin = byId('classicSkin').checked;
    var glossyButtons = byId('glossyButtons').checked;
    var settingsTexture = byId('settingsTexture').checked;

    document.body.className = '';
    if (classicSkin) document.body.className += ' classic-skin';
    if (glossyButtons) document.body.className += (document.body.className ? ' ' : '') + 'glossy-buttons';
    if (settingsTexture) document.body.className += (document.body.className ? ' ' : '') + 'texture-settings';
}

function loadSettings() {
    var agentURL = localStorage.getItem(STORAGE_PREFIX + 'agentURL');
    var openrouterKey = localStorage.getItem(STORAGE_PREFIX + 'openrouterKey');
    var model = localStorage.getItem(STORAGE_PREFIX + 'model');
    var classicSkin = localStorage.getItem(STORAGE_PREFIX + 'classicSkin');
    var glossyButtons = localStorage.getItem(STORAGE_PREFIX + 'glossyButtons');
    var settingsTexture = localStorage.getItem(STORAGE_PREFIX + 'settingsTexture');
    if (agentURL) byId('agentURL').value = agentURL;
    if (openrouterKey) byId('openrouterKey').value = openrouterKey;
    if (model) byId('model').value = model;
    if (classicSkin !== null) byId('classicSkin').checked = classicSkin === '1';
    if (glossyButtons !== null) byId('glossyButtons').checked = glossyButtons === '1';
    if (settingsTexture !== null) byId('settingsTexture').checked = settingsTexture === '1';
    applyThemePrefs();
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function addMessage(role, text) {
    messages.push({ role: role, text: text });
    renderMessages();
}

function renderMessages() {
    var html = '';
    var i;
    for (i = 0; i < messages.length; i++) {
        html += '<div class="message ' + messages[i].role + '">';
        html += '<div class="role">' + (messages[i].role === 'user' ? 'You' : 'rampyai') + '</div>';
        html += '<div class="bubble">' + escapeHtml(messages[i].text) + '</div>';
        html += '</div>';
    }
    byId('messages').innerHTML = html;
}

function extractReply(json, fallbackText) {
    var reply = '';
    if (!json) return fallbackText || 'No response';

    if (json.choices && json.choices.length > 0) {
        if (json.choices[0].message && json.choices[0].message.content) {
            reply = json.choices[0].message.content;
        } else if (json.choices[0].text) {
            reply = json.choices[0].text;
        }
    } else if (json.response) {
        reply = json.response;
    } else if (json.message) {
        reply = json.message;
    } else if (json.error) {
        reply = json.error.message || json.error;
    }

    return reply || fallbackText || 'No response';
}

function formatFailure(statusCode, statusText, bodyText) {
    var parts = [];
    if (statusCode) parts.push('HTTP ' + statusCode);
    if (statusText) parts.push(statusText);
    if (bodyText) parts.push(bodyText);
    if (!statusCode) parts.push('Local server not running or page opened as file');
    return parts.join(': ') || 'Request failed';
}

function clearChat() {
    messages = [];
    renderMessages();
    setStatus('Chat cleared');
}

function sendMessage() {
    var prompt = byId('prompt').value;
    var text = prompt.replace(/^\s+|\s+$/g, '');
    if (!text) {
        setStatus('Type a message first');
        return;
    }
    addMessage('user', text);
    byId('prompt').value = '';
    setStatus('Sending...');

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            var rawText = xhr.responseText || '';
            if (xhr.status === 200) {
                try {
                    var json = eval('(' + xhr.responseText + ')');
                    addMessage('assistant', extractReply(json, rawText));
                    setStatus('Ready');
                } catch (e) {
                    addMessage('assistant', rawText || 'Parse error');
                    setStatus('Ready');
                }
            } else {
                var failure = formatFailure(xhr.status, xhr.statusText, rawText);
                if (rawText) {
                    try {
                        var errJson = eval('(' + rawText + ')');
                        failure = extractReply(errJson, failure);
                    } catch (e2) {
                        failure = rawText;
                    }
                }
                addMessage('assistant', failure);
                setStatus('Ready');
            }
        }
    };

    xhr.open('POST', '/api', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send('baseURL=' + encodeURIComponent(byId('agentURL').value.replace(/\/+$/, '')) + '&apiKey=' + encodeURIComponent(byId('openrouterKey').value) + '&model=' + encodeURIComponent(byId('model').value || 'llama3.2') + '&message=' + encodeURIComponent(text));
}

function runConnectivityCheck() {
    if (location.protocol === 'file:') {
        setStatus('Open http://localhost:3000/ after running the server');
        return;
    }
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                setStatus('OpenRouter ready');
            } else {
                var raw = xhr.responseText || '';
                var failure = formatFailure(xhr.status, xhr.statusText, raw);
                if (raw) {
                    try {
                        var errJson = eval('(' + raw + ')');
                        failure = extractReply(errJson, failure);
                    } catch (e) {
                        failure = raw;
                    }
                }
                setStatus(failure);
            }
        }
    };
    xhr.open('POST', '/api', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send('baseURL=' + encodeURIComponent(byId('agentURL').value.replace(/\/+$/, '')) + '&apiKey=' + encodeURIComponent(byId('openrouterKey').value) + '&model=' + encodeURIComponent(byId('model').value || 'meta-llama/llama-3.1-8b-instruct:free') + '&message=' + encodeURIComponent('ping'));
}

function init() {
    loadSettings();
    if (!byId('agentURL').value) {
        byId('agentURL').value = 'https://openrouter.ai/api/v1';
    }
    if (!byId('model').value) {
        byId('model').value = 'meta-llama/llama-3.1-8b-instruct:free';
    }
    messages = [{ role: 'assistant', text: 'Hi, I am rampyai. Ask me anything.' }];
    renderMessages();
    setStatus('Ready');
    runConnectivityCheck();

    var settings = byId('settings');
    if (settings) {
        settings.scrollIntoView(true);
    }

    if (location.protocol === 'file:') {
        setStatus('Open http://localhost:3000/ after running npm start');
    }
}

window.onload = init;
