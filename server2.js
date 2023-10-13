// Importation des modules nécessaires
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const ioClient = require('socket.io-client');
const jsdom = require("jsdom"); // Jsdom pour récupérer les requêtes SQL du template HTML
const app = express();  // Création de l'application Express
const PORT = 5000;  // Définition du port d'écoute du serveur

// Lecture et stockage du HTML d'erreur dans une variable
let errorHtml;
fs.readFile('Error.html', 'utf8')
    .then(data => {
        errorHtml = data;
    })
    .catch(err => {
        console.error("Échec du chargement du HTML d'erreur:", err.message);
        process.exit(1);  // Arrêt du processus en cas d'erreur
    });

// Utilisation de fs2 (synchronous file system operations) pour lire les images utilisées dans l'en-tête
const fs2 = require('fs');
const header = `
    <header style="margin: auto; padding-top: 10px;">
        <img height="40px" src="data:image/png;base64,${fs2.readFileSync("Img/Inetum.png", {encoding: 'base64'})}"/>
    </header>`;
const footer = `
    <footer style="text-align: center; margin: auto; width: 40%">
        <span style="font-size: 15px;">
            <span class="pageNumber"></span> sur <span class="totalPages"></span>
        </span>
    </footer>`;

// Connexion à la base de données SQLite
let db = new sqlite3.Database('./Database.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connecté à la base de données SQLite.');
});

// Connexion au serveur de notifications sur le port 6000
const notificationServer = ioClient('http://localhost:6000');

app.get('/report/:vehicleId', async (req, res) => {
    try {
        // Extraire vehicleId des paramètres de la route
        const vehicleId = req.params.vehicleId;

        // Lecture et stockage du template HTML dans une variable
        let templateHtml = fs2.readFileSync('Template2.html', 'utf8');
        // Création du dom pour pouvoir récupérer les requêtes du template HTML
        let dom = new jsdom.JSDOM(templateHtml);

        // Récupération des requêtes du template HTML (éléments <span> de classe "sql")
        const queries = dom.window.document.querySelectorAll("span.sql");
        for (let i = 0; i < queries.length; i++) {
            let query = queries[i].textContent; // Récupération de la requête
            let res = await getResultQuery(query, vehicleId); // Exécution de la requête
            queries[i].textContent = res; // Remplacement de la requête par son résultat
        }

        // Utilisation de Puppeteer pour générer un PDF à partir du HTML modifié
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const modifiedHtml = dom.serialize();
        await page.setContent(modifiedHtml);
        await page.addStyleTag({path: 'Template.css'});
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            headerTemplate: header,
            footerTemplate: footer,
            displayHeaderFooter: true
        });
        await browser.close();

        // Notifier un autre serveur que le PDF a été généré avec succès
        notificationServer.emit('pdfGenerated', { 
            status: 'PDF Generated Successfully',
            vehicleId: vehicleId
        });

        // Envoyer le PDF généré en tant que réponse à la requête client
        res.contentType("application/pdf");
        res.send(pdfBuffer);

    } catch (err) {
        // Gestion des erreurs
        if (err.message === 'Vehicle not found') {
            const vehicleId = req.params.vehicleId;
            const totalVehicles = await getTotalVehicles();
            const modifiedErrorHtml = errorHtml
                .replace('[VEHICLE_ID]', vehicleId)
                .replace('[TOTAL_VEHICLE]', totalVehicles);
            res.status(404).send(modifiedErrorHtml);
        } else {
            res.status(500).send("Erreur interne du serveur");
        }
    }
});

// Lancement du serveur Express sur le port défini
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Retourne le résulat de la requête passée en paramètre
// Fonctionne pour de simples requêtes retournant un seul élément
async function getResultQuery(query, vehicleId) {
    return new Promise((resolve, reject) => {
        db.get(query, [vehicleId], (err, row) => {
            if (err) {
                return reject(err);
            }
            if (!row) {
                // Si aucun résultat n'est trouvé (c.-à-d. aucune correspondance ID), rejeter la promesse avec une nouvelle erreur 
                return reject(new Error('Vehicle not found'));
            }
            // Résoudre la promesse avec la première valeur 
            resolve(Object.values(row)[0]);
        });
    });
}

// Fonction utilisée pour le message d'erreur dans le Error.html
// lorsque l'utilisateur entre un id_vehicle qui n'existe pas
async function getTotalVehicles() {
    return new Promise((resolve, reject) => {
        // Exécuter une requête SQL pour obtenir le nombre total de véhicules dans la base de données
        db.get(`SELECT COUNT(*) as count FROM vehicule`, [], (err, row) => {
            if (err) {
                return reject(err);
            }
            // Résoudre la promesse avec le nombre total de véhicules (ou 0 si la requête ne renvoie pas de résultats)
            resolve(row ? row.count : 0);
        });
    });
}