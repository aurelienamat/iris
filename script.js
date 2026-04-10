const socket = new WebSocket('ws://localhost:3003');

socket.onopen = () => {
    console.log('Connecté au serveur');
    socket.send('Bonjour serveur !');
};