let socket = null;
let currentUser = null;

checkSession();

document.querySelectorAll('.tab-btn').forEach(btn => {
	btn.addEventListener('click', () => {
		document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
		document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
		btn.classList.add('active');
		document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
	});
});

document.getElementById('reg-password').addEventListener('input', function () {
	document.getElementById('r-len').classList.toggle('ok', this.value.length >= 8);
	document.getElementById('r-maj').classList.toggle('ok', /[A-Z]/.test(this.value));
	document.getElementById('r-min').classList.toggle('ok', /[a-z]/.test(this.value));
	document.getElementById('r-num').classList.toggle('ok', /[0-9]/.test(this.value));
	document.getElementById('r-spe').classList.toggle('ok', /[!@#$%^&*(),.?":{}|<>]/.test(this.value));
});

document.getElementById('reg-btn').addEventListener('click', async () => {
	const username = document.getElementById('reg-username').value.trim();
	const password = document.getElementById('reg-password').value;
	const errorEl = document.getElementById('reg-error');
	errorEl.textContent = '';

	if (!username || !password) {
		errorEl.textContent = 'Champs requis';
		return;
	}

	const res = await fetch('/inscription', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	}).catch(() => null);

	if (!res) { errorEl.textContent = 'Erreur réseau'; return; }

	const data = await res.json();
	if (data.message === 'Inscription reussie !') {
		currentUser = username;
		const res = await fetch('/connexion', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		}).catch(() => null);

		if (!res) { errorEl.textContent = 'Erreur réseau'; return; }

		const data = await res.json();
		if (data.username) {
			currentUser = data.username;
			enterChat();
		} else {
			errorEl.textContent = data.message;
		}
	} else {
		errorEl.textContent = data.message;
	}
});

document.getElementById('login-btn').addEventListener('click', async () => {
	const username = document.getElementById('login-username').value.trim();
	const password = document.getElementById('login-password').value;
	const errorEl = document.getElementById('login-error');
	errorEl.textContent = '';

	if (!username || !password) {
		errorEl.textContent = 'Champs requis';
		return;
	}

	const res = await fetch('/connexion', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	}).catch(() => null);

	if (!res) { errorEl.textContent = 'Erreur réseau'; return; }

	const data = await res.json();
	if (data.username) {
		currentUser = data.username;
		enterChat();
	} else {
		errorEl.textContent = data.message;
	}
});


document.getElementById('login-password').addEventListener('keydown', e => {
	if (e.key === 'Enter') document.getElementById('login-btn').click();
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

async function loadOldMessages() {
	const res = await fetch('/oldMessages').catch(() => null);
	if (!res || !res.ok) return;

	const messages = await res.json();

	messages.reverse().forEach(msg => {
		appendMessage(msg.message, msg.username, msg.username === currentUser);
	});
}

function enterChat() {
	document.getElementById('header-user').textContent = currentUser;
	showScreen('chat');
	connectWS();
	loadOldMessages();
	document.getElementById('msg-input').focus();
}

function showScreen(name) {
	document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
	document.getElementById(name + '-screen').classList.add('active');
}

function connectWS() {
	if (socket) {
		socket.onclose = null;
		socket.close();
		socket = null;
	}

	socket = new WebSocket('ws://172.29.19.8:3003');

	socket.addEventListener('open', () => { });

	socket.addEventListener('message', e => {
		const data = JSON.parse(e.data);
		appendMessage(data.message, data.username, data.username === currentUser);
	});

	socket.addEventListener('close', () => {
		setTimeout(connectWS, 2500);
	});

	socket.addEventListener('error', () => socket.close());
}

function appendMessage(text, sender, isOwn) {
	const inner = document.getElementById('messages-inner');
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
	} else {
		group = lastGroup;
	}

	const bubble = document.createElement('div');
	bubble.className = 'msg-bubble';
	bubble.textContent = text;
	group.appendChild(bubble);

	const oldTime = group.querySelector('.msg-time');
	if (oldTime) oldTime.remove();

	const timeEl = document.createElement('div');
	timeEl.className = 'msg-time';
	timeEl.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	group.appendChild(timeEl);

	const messages = document.getElementById('messages');
	messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
}

function sendMessage() {
	const input = document.getElementById('msg-input');
	const text = input.value.trim();
	if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

	socket.send(JSON.stringify({ message: text }));
	input.value = '';
	input.focus();
}

document.getElementById('send-btn').addEventListener('click', sendMessage);

document.getElementById('msg-input').addEventListener('keydown', e => {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		sendMessage();
	}
});

document.getElementById('logout-btn').addEventListener('click', async () => {
	await fetch('/deconnexion', { method: 'POST' }).catch(() => { });
	if (socket) socket.close();
	socket = null;
	currentUser = null;
	document.getElementById('messages-inner').innerHTML = '';
	showScreen('auth');
});
