let socket = null;
let currentUser = null;
let lastSender = null;

const $ = id => document.getElementById(id);

checkSession();

document.querySelectorAll('.tab-btn').forEach(btn => {
	btn.addEventListener('click', () => {
		document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
		document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
		btn.classList.add('active');
		$('tab-' + btn.dataset.tab).classList.add('active');
		$('login-error').textContent = '';
		$('reg-error').textContent = '';
		$('reg-success').textContent = '';
	});
});

$('reg-password').addEventListener('input', function() {
	const v = this.value;
	$('r-len').classList.toggle('ok', v.length >= 8);
	$('r-maj').classList.toggle('ok', /[A-Z]/.test(v));
	$('r-min').classList.toggle('ok', /[a-z]/.test(v));
	$('r-num').classList.toggle('ok', /[0-9]/.test(v));
	$('r-spe').classList.toggle('ok', /[!@#$%^&*(),.?":{}|<>]/.test(v));
});

$('reg-btn').addEventListener('click', async () => {
	const username = $('reg-username').value.trim();
	const password = $('reg-password').value;
	$('reg-error').textContent = '';
	$('reg-success').textContent = '';

	if (!username) {
		$('reg-error').textContent = 'Identifiant requis';
		return;
	}

	const res = await fetch('/inscription', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	}).catch(() => null);

	if (!res) { $('reg-error').textContent = 'Erreur réseau'; return; }

	const data = await res.json();
	if (data.message === 'Inscription réussie !') {
		$('reg-success').textContent = data.message;
		$('reg-username').value = '';
		$('reg-password').value = '';
		document.querySelectorAll('.pwd-rules span').forEach(s => s.classList.remove('ok'));
		setTimeout(() => document.querySelector('[data-tab="login"]').click(), 1200);
	} else {
		$('reg-error').textContent = data.message;
	}
});

$('login-btn').addEventListener('click', async () => {
	const username = $('login-username').value.trim();
	const password = $('login-password').value;
	$('login-error').textContent = '';

	if (!username || !password) {
		$('login-error').textContent = 'Champs requis';
		return;
	}

	const res = await fetch('/connexion', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	}).catch(() => null);

	if (!res) { $('login-error').textContent = 'Erreur réseau'; return; }

	const data = await res.json();
	if (data.username) {
		currentUser = data.username;
		enterChat();
	} else {
		$('login-error').textContent = data.message;
	}
});

$('login-password').addEventListener('keydown', e => {
	if (e.key === 'Enter') $('login-btn').click();
});

async function checkSession() {
	const res = await fetch('/isConnect', { method: 'POST' }).catch(() => null);
	if (res && res.ok) {
		const data = await res.json();
		if (data.username) {
			currentUser = data.username;
			enterChat();
			return;
		}
	}
	showScreen('auth');
}

function enterChat() {
	$('header-user').textContent = currentUser;
	showScreen('chat');
	connectWS();
	$('msg-input').focus();
}

function showScreen(name) {
	document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
	$(name + '-screen').classList.add('active');
}

function connectWS() {
	const proto = location.protocol === 'https:' ? 'wss' : 'ws';
	socket = new WebSocket(`${proto}://${location.host}`);

	socket.addEventListener('open', () => {
		$('status-text').textContent = 'En ligne';
	});

	socket.addEventListener('message', e => {
		const data = JSON.parse(e.data);
		appendMessage(data.message, data.username, data.username === currentUser);
	});

	socket.addEventListener('close', () => {
		$('status-text').textContent = 'Reconnexion...';
		setTimeout(connectWS, 2500);
	});

	socket.addEventListener('error', () => socket.close());
}

function appendMessage(text, sender, isOwn) {
	const inner = $('messages-inner');
	const lastGroup = inner.lastElementChild;

	let group;
	if (!lastGroup || lastGroup.dataset.sender !== sender) {
		group = document.createElement('div');
		group.className = 'msg-group' + (isOwn ? ' own' : '');
		group.dataset.sender = sender;

		const senderEl = document.createElement('div');
		senderEl.className = 'msg-sender';
		senderEl.textContent = isOwn ? 'Vous' : sender;
		group.appendChild(senderEl);

		inner.appendChild(group);
		lastSender = sender;
	} else {
		group = lastGroup;
	}

	const bubble = document.createElement('div');
	bubble.className = 'msg-bubble';
	bubble.textContent = text;
	group.appendChild(bubble);

	let timeEl = group.querySelector('.msg-time');
	if (!timeEl) {
		timeEl = document.createElement('div');
		timeEl.className = 'msg-time';
		group.appendChild(timeEl);
	}
	timeEl.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

	$('messages').scrollTo({ top: $('messages').scrollHeight, behavior: 'smooth' });
}

function sendMessage() {
	const input = $('msg-input');
	const text = input.value.trim();
	if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

	socket.send(JSON.stringify({ message: text }));
	input.value = '';
	input.style.height = 'auto';
	input.focus();
}

$('send-btn').addEventListener('click', sendMessage);

$('msg-input').addEventListener('keydown', e => {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		sendMessage();
	}
});

$('msg-input').addEventListener('input', function() {
	this.style.height = 'auto';
	this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

$('logout-btn').addEventListener('click', async () => {
        await fetch('/deconnexion', { method: 'POST' }).catch(() => {});
	socket?.close();
	socket = null;
	currentUser = null;
	lastSender = null;
	$('messages-inner').innerHTML = '';
	showScreen('auth');
});
