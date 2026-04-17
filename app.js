var STORAGE_PREFIX = 'rampyai.';
var messages = [];

function byId(id) {
    return document.getElementById(id);
}

function setStatus(text) {
    byId('statusText').innerHTML = text;
}

function saveSettings() {
    localStorage.setItem(STORAGE_PREFIX + 'apiKey', byId('apiKey').value);
    localStorage.setItem(STORAGE_PREFIX + 'baseURL', byId('baseURL').value);
    localStorage.setItem(STORAGE_PREFIX + 'model', byId('model').value);
    setStatus('Settings saved');
}

function loadSettings() {
    var apiKey = localStorage.getItem(STORAGE_PREFIX + 'apiKey');
    var baseURL = localStorage.getItem(STORAGE_PREFIX + 'baseURL');
    var model = localStorage.getItem(STORAGE_PREFIX + 'model');
    if (apiKey) byId('apiKey').value = apiKey;
    if (baseURL) byId('baseURL').value = baseURL;
    if (model) byId('model').value = model;
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
    var baseURL = byId('baseURL').value.replace(/\/+$/, '');
    var model = byId('model').value || 'gpt-3.5-turbo';
    var apiKey = byId('apiKey').value;

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var json = eval('(' + xhr.responseText + ')');
                    var reply = '';
                    if (json && json.choices && json.choices.length > 0) {
                        reply = json.choices[0].message.content;
                    } else if (json && json.error) {
                        reply = json.error.message || 'Error';
                    }
                    addMessage('assistant', reply || 'No response');
                    setStatus('Ready');
                } catch (e) {
                    addMessage('assistant', 'Parse error');
                    setStatus('Error');
                }
            } else {
                addMessage('assistant', 'Network error');
                setStatus('Error');
            }
        }
    };

    xhr.open('POST', '/api', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send('baseURL=' + encodeURIComponent(baseURL) + '&apiKey=' + encodeURIComponent(apiKey) + '&model=' + encodeURIComponent(model) + '&message=' + encodeURIComponent(text));
}

function init() {
    loadSettings();
    messages = [{ role: 'assistant', text: 'Hi, I am rampyai. Ask me anything.' }];
    renderMessages();
    setStatus('Ready');
}

window.onload = init;
