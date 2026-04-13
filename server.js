//.env
require('dotenv').config();

const http = require('http');
const cookie = require('cookie');
const express = require('express');
const app = express();
const server = http.createServer(app);
const { WebSocketServer } = require('ws');
const ws = new WebSocketServer({ server });

const bcrypt = require('bcrypt'); //POUR HASH
const mysql = require('mysql2'); //Mysql
//Token
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(express.static('html')); //Selection du dossier html
app.use(express.json()); //Sert a utiliser json

//Connexion a la base de donner
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true //Pour faire plusieurs commande sql en 1fois
});
connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données :', err);
    return;
  }
  console.log('Connecté à la base de données MySQL.');
});

//WEBSOCKET
ws.on('connection', (client, request) => {
  verifTokenWS(client, request);
  console.log('Nouveau client connecté : ' + client.username);
  client.on('message', (data) => {
    const msg = JSON.parse(data);
    console.log('Message reçu :', msg);

    connection.query(
      'INSERT INTO messages(message,idUsers) VALUES(?,?)',
      [msg.message, client.id], (err, results) => {
        if (err) {
          console.log('Erreur insertion ' + err);
        }
        if (results) {
          // Rediffusion à tous les clients connectés
          ws.clients.forEach((c) => {
            c.send(JSON.stringify(msg));
          });
        }
      }
    )


  });

  client.on('close', () => {
    console.log('Client déconnecté');
  });
});



//Lire sur le port 3003
server.listen(3003, () => {
  console.log('Server is running on :3003');
})


//Gestion Inscription Utilisateur
app.post('/inscription', (req, res) => {
  //console.log(req.body);
  //Verification insertion
  if (req.body.password.length < 8) {
    res.json({ message: 'Mot de passe invalide', error: "length" });
    return;
  }
  if (!/[A-Z]/.test(req.body.password)) {
    res.json({ message: 'Mot de passe invalide', error: "Majuscule" });
    return;
  }
  if (!/[a-z]/.test(req.body.password)) {
    res.json({ message: 'Mot de passe invalide', error: "Minuscule" });
    return;
  }
  if (!/[0-9]/.test(req.body.password)) {
    res.json({ message: 'Mot de passe invalide', error: "Chiffre" });
    return;
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(req.body.password)) {
    res.json({ message: 'Mot de passe invalide', error: "Carractère spécial" });
    return;
  }

  //Hachage mot de passe 
  bcrypt.hash(req.body.password, 10)
    .then(hash => {
      //Insertion dans la base
      connection.query(
        'INSERT INTO users(username,password) VALUES(?,?)',
        [req.body.username, hash],
        (err, results) => {
          if (err) {
            console.log('Erreur Insertion dans la base ' + err);
            res.status(500).json({ message: 'Erreur bdd insertion', erreur: err });
            return;
          }
          console.log('Insertion réussi');
          res.json({ message: 'Inscription reussie !' });
        }
      )
    })

})



//CONNEXION
app.post('/connexion', (req, res) => {
  //console.log(req.body);

  //Récupération password dans la base pour la comparaison
  connection.query(
    'SELECT password,id,username FROM users WHERE username = ?',
    [req.body.username], (err, results) => {
      if (err) {
        console.log("Erreur récupération username " + err);
        return;
      }
      if (results.length == 0) {
        console.log("Erreur identifiant");
        res.json({ message: 'Identifiant ou mot de passe invalides' });
        return;
      }
      //console.log(results[0]);
      //res.json({ message: 'Email trouvé' });
      let resultat = results[0];
      bcrypt.compare(req.body.password, resultat.password, (err, results) => {
        if (err) {
          console.log('Erreur compare' + err);
          res.json({ message: 'err hash' });
          return;
        }
        if (results) {
          console.log('Connexion réussi id : ' + resultat.id + ", username : " + resultat.username);

          //Creation du token
          const token = jwt.sign(
            { id: resultat.id, username: resultat.username },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
          );

          res.cookie('authtoken', token, {
            httpOnly: true, //empêche le JavaScript d'accéder au cookie, donc protège contre le XSS
            secure: false, // force le cookie à passer uniquement en HTTPS si true                         !!! attention à mettre true en production !!!
            sameSite: 'strict', //protège contre les attaques CSRF.
            maxAge: 30 * 24 * 60 * 60 * 1000
            //maxAge : 10 * 1000
          })

          res.json({ message: "connexion reussi", username: resultat.username, idUsers: resultat.id });


        } else {
          res.json({ message: 'connexion echoué' });
          return;
        }
      })
    }
  )
})

app.post('/isConnect', verifToken, (req, res) => {
  console.log('Déjà connecté id : ' + req.user.id + ' username : ' + req.user.username);
  res.json({ message: 'Connecté', username: req.user.username });
})

app.post('/deconnexion', verifToken, (req, res) => {
  res.clearCookie('authtoken');
  console.log("l'id " + req.user.id + " se déco");
  res.json({ message: 'Déconnecté' });
});


//Verification token
function verifToken(req, res, next) {
  const token = req.cookies.authtoken;

  if (!token) {
    return res.status(401).json({ message: 'Non connecté' });
  }

  //test si le token est valide
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('authtoken');
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }

}

// Vérification WebSocket
function verifTokenWS(client, request) {
  const cookies = cookie.parse(request.headers.cookie || '');
  const token = cookies.authtoken;
  if (!token) { client.close(); return; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    client.username = decoded.username;
    client.id = decoded.id;
    console.log('Token Valide');
  } catch (err) {
    client.close();
  }
}
