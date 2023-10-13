// Importation des modules nécessaires
const express = require('express');  // Module Express pour gérer le serveur HTTP
const sqlite3 = require('sqlite3').verbose();  // SQLite pour la gestion de base de données
const fs = require('fs').promises;  // FileSystem pour gérer les fichiers, ici en version asynchrone
const puppeteer = require('puppeteer');  // Puppeteer pour générer des PDF à partir de HTML
const ioClient = require('socket.io-client');  // Client Socket.IO pour communiquer avec d'autres serveurs via WebSockets
const app = express();  // Création de l'application Express
const PORT = 5000;  // Définition du port d'écoute du serveur

// Lecture et stockage du template HTML dans une variable
let templateHtml;
fs.readFile('Template.html', 'utf8')
    .then(data => {
        templateHtml = data;
    })
    .catch(err => {
        console.error("Échec du chargement du modèle HTML:", err.message);
        process.exit(1);  // Arrêt du processus en cas d'erreur
    });

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

// Définition d'une route /report/:vehicleId pour générer et envoyer un rapport PDF
app.get('/report/:vehicleId', async (req, res) => {
    try {
        // Extraire vehicleId des paramètres de la route
        const vehicleId = req.params.vehicleId;

        // Récupérer diverses informations en utilisant des fonctions de base de données définies ci-dessous
        const vehicleDescription = await getVehicleDescription(vehicleId);
        const totalIncidents = await getTotalIncidents(vehicleId);
        const incidentListHtml = await getIncidentListHtml(vehicleId);
        const incidentsByPosteHtml = await getIncidentsByPosteHtml(vehicleId);

        // Remplacer les balises dans le template HTML par les données récupérées
        const modifiedHtml = templateHtml
            .replace('[VEHICLE_DESCRIPTION]', vehicleDescription)
            .replace('[VEHICLE_DESCRIPTION]', vehicleDescription)
            .replace('[VEHICLE_DESCRIPTION]', vehicleDescription)
            .replace('[TOTAL_INCIDENTS]', totalIncidents)
            .replace('[INCIDENT_LIST]', incidentListHtml)
            .replace('[INCIDENTS_BY_POSTE]', incidentsByPosteHtml[0])
            .replace("[SUMMARY_WORKSTATION]", incidentsByPosteHtml[1]);

        // Utilisation de Puppeteer pour générer un PDF à partir du HTML modifié
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
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
            status: 'PDF généré avec succès',
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
    console.log(`Le serveur est en marche sur http://localhost:${PORT}`);
});

// Fonction pour envoyer une notification à un serveur de notification spécifique
async function sendNotification(message) {
    try {
        // Utilisation de fetch pour envoyer une requête POST au serveur de notification
        const response = await fetch('http://localhost:6000/report-ready', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }), // Envoi du message en tant que corps de la requête, formaté en JSON
        });

        // Vérification si la requête a échoué
        if (!response.ok) {
            throw new Error('Notification failed');
        }
    } catch (error) {
        // Gestion d'erreurs et journalisation
        console.error('Failed to send notification:', error.message);
    }
}

// Fonction pour obtenir la description d'un véhicule à partir de la base de données
async function getVehicleDescription(vehicleId) {
    return new Promise((resolve, reject) => {
        // Exécution d'une requête SQL pour obtenir la description d'un véhicule avec un ID spécifique
        db.get(`SELECT vehicule_desc FROM vehicule WHERE vehicule_id = ?`, [vehicleId], (err, row) => {
            if (err) {
                return reject(err);
            }

            // Si le véhicule n'est pas trouvé, rejet avec une erreur spécifique
            if (!row) {
                return reject(new Error('Vehicle not found'));
            }
            resolve(row.vehicule_desc);
        });
    });
}

// Fonction pour obtenir le total des incidents liés à un véhicule spécifique
async function getTotalIncidents(vehicleId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM incident WHERE ordre IN (SELECT ordre_id FROM ordre WHERE vehicule = ?)`, [vehicleId], (err, row) => {
            if (err) {
                return reject(err);
            }
            // Récupération du total des incidents et choix de la couleur du fond en fonction
            let totalIncidents = row ? row.count : 0;
            let bgColor = totalIncidents === 0 ? "#4EB300" : "red";
            // Résolution de la promesse avec une chaîne HTML formatée
            resolve(`<span style="background-color: ${bgColor}; border: 1px solid black;">&nbsp;&nbsp;${totalIncidents}&nbsp;&nbsp;</span>`);
        });
    });
}

// Fonction pour générer le HTML de la liste des incidents liés à un véhicule spécifique
async function getIncidentListHtml(vehicleId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT incident_id, incident_desc, etat, ordre_id, ordre_desc FROM incident JOIN ordre ON incident.ordre = ordre.ordre_id WHERE ordre IN (SELECT ordre_id FROM ordre WHERE vehicule = ?)`, [vehicleId], (err, rows) => {
            if (err) {
                return reject(err);
            }
            // Génération du HTML pour chaque incident et jointure dans une seule chaîne
            let incidentListHtml = rows.map(row => {
                let bgColor = row.etat === "OPEN" ? "red" : "#4EB300";
                return `
                    <tr>
                        <td>${row.incident_id}</td>
                        <td>${row.incident_desc}</td>
                        <td style="background-color: ${bgColor}">${row.etat}</td>
                        <td style="text-align: center">${row.ordre_id}</td>
                        <td>${row.ordre_desc}</td>
                    </tr>`;
            }).join('');
            // Entourage de la liste des incidents avec des balises de table si des incidents existent
            incidentListHtml = rows.length ? `<table>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Description de l'incident</th>
                                                    <th>Etat</th>
                                                    <th nowrap style="text-align: center">Ordre ID</th>
                                                    <th>Ordre de travail</th>
                                                </tr>
                                                ${incidentListHtml}
                                              </table>` : "<p>Aucun incident n'a été détecté.</p>";
            // Résolution de la promesse avec la chaîne HTML générée
            resolve(incidentListHtml);
        });
    });
}

async function getIncidentsByPosteHtml(vehicleId) {
    return new Promise((resolve, reject) => {
        // Exécuter une requête SQL pour obtenir des incidents basés sur un ID de véhicule spécifique,
        // en les joignant avec des ordres et des postes.
        db.all(`SELECT poste.poste_id, poste.poste_desc, incident.incident_desc, incident.etat, ordre.ordre_desc FROM incident
                JOIN ordre ON incident.ordre = ordre.ordre_id
                JOIN poste ON ordre.poste = poste.poste_id
                WHERE ordre.vehicule = ? ORDER BY poste.poste_id`,
        [vehicleId], (err, rows) => {
            if (err) {
                return reject(err);
            }

            // Construction d'une table pour chaque poste
            // Initialisation des variables utilisées pour construire le HTML
            let incidentsByPosteHtml = '';
            let currentPoste = '';
            let summaryWorkstation = ''; // pour la table des matières

            // Itérer à travers chaque ligne retournée par la requête
            rows.forEach(row => {
                // Vérification si nous avons changé de poste dans l'itération actuelle
                if (row.poste_desc !== currentPoste) {
                    // Ajouter une balise de fermeture de tableau si nous avons déjà un poste courant
                    incidentsByPosteHtml += currentPoste ? '</table>' : '';
                    // Mettre à jour le HTML avec les nouveaux détails du poste et initialiser un nouveau tableau
                    incidentsByPosteHtml += `<h3 id="workstation${row.poste_id}">${row.poste_desc}</h3><table><tr><th>Description de l'incident</th><th>Etat</th><th>Ordre de travail</th></tr>`;
                    // Mettre à jour le poste courant pour les itérations suivantes
                    currentPoste = row.poste_desc;
                    // Ajouter un lien vers le poste pour la table des matières
                    summaryWorkstation += `<li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="#workstation${row.poste_id}">${row.poste_desc}</a></li>`;
                }
                // Déterminer la couleur de fond en fonction de l'état de l'incident
                let bgColor = row.etat === "OPEN" ? "red" : "#4EB300";
                // Ajouter les détails de l'incident au HTML
                incidentsByPosteHtml += `<tr><td>${row.incident_desc}</td><td style="background-color: ${bgColor}">${row.etat}</td><td>${row.ordre_desc}</td></tr>`;
            });
            // Ajouter une fermeture de tableau si des lignes ont été retournées, sinon ajouter un message indiquant l'absence d'incidents
            incidentsByPosteHtml += rows.length ? '</table>' : "<p>Aucun incident n'a été détecté.</p>";
            // Résoudre la promesse avec le HTML des incidents et le sommaire des postes pour la table des matières
            resolve([incidentsByPosteHtml, summaryWorkstation]);
        });
    });
}

async function getVehicleDescription(vehicleId) {
    return new Promise((resolve, reject) => {
        // Exécuter une requête SQL pour obtenir la description du véhicule basée sur l'ID du véhicule
        db.get(`SELECT vehicule_desc FROM vehicule WHERE vehicule_id = ?`, [vehicleId], (err, row) => {
            if (err) {
                return reject(err);
            }

            // Si aucun résultat n'est trouvé (c.-à-d. aucune correspondance ID), rejeter la promesse avec une nouvelle erreur
            if (!row) {
                return reject(new Error('Vehicle not found'));
            }
            // Résoudre la promesse avec la description du véhicule
            resolve(row.vehicule_desc);
        });
    });
}

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