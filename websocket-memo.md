# Mémo WebSocket

## Principe
Connexion persistante et bidirectionnelle entre client et serveur.
Une seule "poignée de main" HTTP au départ, ensuite le canal reste ouvert.

---

## Côté Serveur (Node.js — librairie `ws`)

### Initialisation
```js
const http = require('http');
const { WebSocketServer } = require('ws');
const server = http.createServer(app);
const ws = new WebSocketServer({ server });
```

### Événements
```js
ws.on('connection', (client) => {
  // Un nouveau client vient de se connecter
  // `client` = connexion individuelle de ce client

  client.on('message', (data) => {
    // Le client envoie un message
    const msg = JSON.parse(data);
  });

  client.on('close', () => {
    // Le client s'est déconnecté
  });

  client.on('error', (err) => {
    // Une erreur est survenue sur cette connexion
  });
});
```

### Envoyer un message
```js
client.send(JSON.stringify(msg));         // à un client spécifique
ws.clients.forEach(c => c.send(...));     // à tous les clients connectés
```

### Propriétés utiles
```js
client.readyState === WebSocket.OPEN  // vérifier qu'un client est encore connecté
ws.clients.size                       // nombre de clients connectés
```

---

## Côté Client (Navigateur — API native)

### Connexion
```js
const socket = new WebSocket('ws://localhost:3003');
```

### Événements
```js
socket.onopen = () => {
  // Connexion établie, on peut envoyer
};

socket.onmessage = (event) => {
  // Réception d'un message du serveur
  const msg = JSON.parse(event.data);
};

socket.onclose = () => {
  // Connexion fermée
};

socket.onerror = (err) => {
  // Erreur de connexion
};
```

### Envoyer un message
```js
socket.send(JSON.stringify({ username: 'Alice', text: 'Bonjour' }));
```

---

## Résumé des événements

| Événement    | Serveur (`ws`) | Client (navigateur) |
|--------------|:--------------:|:-------------------:|
| Connexion    | `connection`   | `open`              |
| Réception    | `message`      | `message`           |
| Déconnexion  | `close`        | `close`             |
| Erreur       | `error`        | `error`             |

---

## Flux d'un message de chat

```
[Client A] socket.send(msg)
     ↓
[Serveur]  ws.on('message') → parse → ws.clients.forEach → send
     ↓
[Clients]  onmessage → JSON.parse → affichage
```
