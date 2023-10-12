const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const ioClient = require('socket.io-client'); // Added line to require socket.io client
const app = express();
const PORT = 5000;

let templateHtml;

fs.readFile('template.html', 'utf8')
    .then(data => {
        templateHtml = data;
    })
    .catch(err => {
        console.error("Failed to load HTML template:", err.message);
        process.exit(1);
    });

let errorHtml;

fs.readFile('Error.html', 'utf8')
    .then(data => {
        errorHtml = data;
    })
    .catch(err => {
        console.error("Failed to load HTML error:", err.message);
        process.exit(1);
    });

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

let db = new sqlite3.Database('./Database.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// Connecting to the notification server
const notificationServer = ioClient('http://localhost:6000'); // Added line to connect to the notification server

app.get('/report/:vehicleId', async (req, res) => {
    try {
        const vehicleId = req.params.vehicleId;
        const vehicleDescription = await getVehicleDescription(vehicleId);
        const totalIncidents = await getTotalIncidents(vehicleId);
        const incidentListHtml = await getIncidentListHtml(vehicleId);
        const incidentsByPosteHtml = await getIncidentsByPosteHtml(vehicleId);

        const modifiedHtml = templateHtml
            .replace('[VEHICLE_DESCRIPTION]', vehicleDescription)
            .replace('[VEHICLE_DESCRIPTION]', vehicleDescription)
            .replace('[VEHICLE_DESCRIPTION]', vehicleDescription)
            .replace('[TOTAL_INCIDENTS]', totalIncidents)
            .replace('[INCIDENT_LIST]', incidentListHtml)
            .replace('[INCIDENTS_BY_POSTE]', incidentsByPosteHtml[0])
            .replace("[SUMMARY_WORKSTATION]", incidentsByPosteHtml[1]);

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

        notificationServer.emit('pdfGenerated', { 
            status: 'PDF Generated Successfully',
            vehicleId: vehicleId
        });

        res.contentType("application/pdf");
        res.send(pdfBuffer);

    } catch (err) {
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

async function sendNotification(message) {
    try {
        const response = await fetch('http://localhost:6000/report-ready', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }), // Sending message as JSON
        });

        if (!response.ok) {
            throw new Error('Notification failed');
        }
    } catch (error) {
        console.error('Failed to send notification:', error.message);
    }
}

// Database functions
async function getVehicleDescription(vehicleId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT vehicule_desc FROM vehicule WHERE vehicule_id = ?`, [vehicleId], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row ? row.vehicule_desc : 'N/A');
        });
    });
}

async function getTotalIncidents(vehicleId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM incident WHERE ordre IN (SELECT ordre_id FROM ordre WHERE vehicule = ?)`, [vehicleId], (err, row) => {
            if (err) {
                return reject(err);
            }
            let totalIncidents = row ? row.count : 0;
            let bgColor = totalIncidents === 0 ? "#4EB300" : "red";
            resolve(`<span style="background-color: ${bgColor}; border: 1px solid black;">&nbsp;&nbsp;${totalIncidents}&nbsp;&nbsp;</span>`);
        });
    });
}

async function getIncidentListHtml(vehicleId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT incident_id, incident_desc, etat, ordre_id, ordre_desc FROM incident JOIN ordre ON incident.ordre = ordre.ordre_id WHERE ordre IN (SELECT ordre_id FROM ordre WHERE vehicule = ?)`, [vehicleId], (err, rows) => {
            if (err) {
                return reject(err);
            }
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
            incidentListHtml = rows.length ? `<table>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Description de l'incident</th>
                                                    <th>Etat</th>
                                                    <th nowrap style="text-align: center">Ordre ID</th> <!-- Updated header -->
                                                    <th>Ordre de travail</th>
                                                </tr>
                                                ${incidentListHtml}
                                            </table>` : "<p>Aucun incident n'a été détecté.</p>";
            resolve(incidentListHtml);
        });
    });
}

async function getIncidentsByPosteHtml(vehicleId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT poste.poste_id, poste.poste_desc, incident.incident_desc, incident.etat, ordre.ordre_desc FROM incident JOIN ordre ON incident.ordre = ordre.ordre_id JOIN poste ON ordre.poste = poste.poste_id WHERE ordre.vehicule = ? ORDER BY poste.poste_id`, [vehicleId], (err, rows) => {
            if (err) {
                return reject(err);
            }

            let incidentsByPosteHtml = '';
            let currentPoste = '';
            let summaryWorkstation = '';
            rows.forEach(row => {
                if (row.poste_desc !== currentPoste) {
                    incidentsByPosteHtml += currentPoste ? '</table>' : '';
                    incidentsByPosteHtml += `<h3 id="workstation${row.poste_id}">${row.poste_desc}</h3><table><tr><th>Description de l'incident</th><th>Etat</th><th>Ordre de travail</th></tr>`;
                    currentPoste = row.poste_desc;
                    summaryWorkstation += `<li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="#workstation${row.poste_id}">${row.poste_desc}</a></li>`;
                }
                let bgColor = row.etat === "OPEN" ? "red" : "#4EB300";
                incidentsByPosteHtml += `<tr><td>${row.incident_desc}</td><td style="background-color: ${bgColor}">${row.etat}</td><td>${row.ordre_desc}</td></tr>`;
            });
            incidentsByPosteHtml += rows.length ? '</table>' : "<p>Aucun incident n'a été détecté.</p>";
            resolve([incidentsByPosteHtml, summaryWorkstation]);
        });
    });
}

async function getVehicleDescription(vehicleId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT vehicule_desc FROM vehicule WHERE vehicule_id = ?`, [vehicleId], (err, row) => {
            if (err) {
                return reject(err);
            }
            if (!row) {
                return reject(new Error('Vehicle not found'));
            }
            resolve(row.vehicule_desc);
        });
    });
}

async function getTotalVehicles() {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM vehicule`, [], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row ? row.count : 0);
        });
    });
}