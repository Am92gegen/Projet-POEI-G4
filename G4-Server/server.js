// Imports
// Ici je recupère la librairie express.js

let express = require('express');

// Instanciation du server
let server = express();

// Configuration routes
server.get('/', function (req, res) {
    res.setHeader('Content-Type','text/html');
    res.status(200).send('<h1>Bienvenu sur notre serveur</h1>');

});

// Lancement server
server.listen(8080, function(){
    console.log('Server en écoute :)')
});