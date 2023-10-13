// Importation des modules nécessaires
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Création d'une application Express
const app = express();
// Création d'un serveur HTTP à partir de l'application Express
const server = http.createServer(app);
// Initialisation du serveur Socket.IO en passant le serveur HTTP
const io = socketIo(server);
// Définition du port sur lequel le serveur écoutera
const PORT = 6000;

// Écoute des connexions entrantes sur le serveur Socket.IO
io.on('connection', (socket) => {
    // Message log pour indiquer qu'une connexion a été établie
    console.log('Notification server connected');

    // Écoute de l'événement personnalisé 'pdfGenerated' depuis le client
    socket.on('pdfGenerated', (data) => {
        // Message log pour indiquer le statut de la génération du PDF et l'ID du véhicule concerné
        console.log('PDF Generation Status:', data.status, 'for vehicle ID:', data.vehicleId);
    });

    // Écoute de la déconnexion du socket
    socket.on('disconnect', () => {
        // Message log pour indiquer que la connexion avec le serveur de notifications a été interrompue
        console.log('Notification server disconnected');
    });
});

// Lancement du serveur HTTP et écoute sur le port spécifié
server.listen(PORT, () => {
    // Message log pour confirmer que le serveur est en marche et indiquer l'URL d'accès
    console.log(`Notification server is running on http://localhost:${PORT}`);
});