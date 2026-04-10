// ROUTES ---------------------------------------------------------------------------------------------------------------------------------------------------------

// ROUTE INSCRIPTION ========================================================
// envoie du username/password en POST sur /inscription

//Variables
const password = document.getElementById('passwordInput');
const username = document.getElementById('usernameInput');

const btnInscription = document.getElementById('registerButton');
const connexion = document.getElementById('loginButton');

btnInscription.addEventListener('click', () => {

    fetch('/inscription', {
        credentials: 'include',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username.value,
            password: password.value,
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.erreur) {
                alert(data.erreur.sqlMessage); // Ex: "Mot de passe invalide" ou "Inscription reussie !"
            } else {
                alert(data.message);
            }
            console.log(data);
        });
});

// ROUTE CONNEXION ====================================================================
// envoie username/password en POST sur /connexion
// le serveur renvoie l'id de l'utilisateur

connexion.addEventListener('click', () => {
    fetch('/connexion', {
        credentials: 'include',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.message == 'connexion echoué') { // Connexion échouée
                alert(data.message);
                console.log(data.message);
            } else { // Connexion réussie, on sauvegarde la classe dans le localStorage
                //console.log('Connexion réussie, classe : ' + data.classe);
               
                //Remplissage du local storage
                localStorage.setItem('idUsers', data.idUsers);
                localStorage.setItem('username', data.username);
            }
        })
})
