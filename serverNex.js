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
            .replace('[TOTAL_INCIDENTS]', totalIncidents)
            .replace('[INCIDENT_LIST]', incidentListHtml)
            .replace('[INCIDENTS_BY_POSTE]', incidentsByPosteHtml);

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(modifiedHtml);
        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();

        // Emitting a message to the notification server
        notificationServer.emit('pdfGenerated', { // Added line to emit message
            status: 'PDF Generated Successfully',
            vehicleId: vehicleId
        });

        res.contentType("application/pdf");
        res.send(pdfBuffer);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
// ... Your database functions remain unchanged ...


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
            resolve(row ? row.count : 0);
        });
    });
}

async function getIncidentListHtml(vehicleId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT incident_id, incident_desc, etat, ordre_desc FROM incident JOIN ordre ON incident.ordre = ordre.ordre_id WHERE ordre IN (SELECT ordre_id FROM ordre WHERE vehicule = ?)`, [vehicleId], (err, rows) => {
            if (err) {
                return reject(err);
            }
            const incidentListHtml = rows.map(row => {
                return `
                    <tr>
                        <td>${row.incident_id}</td>
                        <td>${row.incident_desc}</td>
                        <td>${row.etat}</td>
                        <td>${row.incident_id}, ${row.ordre_desc}</td> <!-- Modified line -->
                    </tr>`;
            }).join('');
            resolve(incidentListHtml);
        });
    });
}


async function getIncidentsByPosteHtml(vehicleId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT poste.poste_desc, incident.incident_desc, incident.etat, ordre.ordre_desc FROM incident JOIN ordre ON incident.ordre = ordre.ordre_id JOIN poste ON ordre.poste = poste.poste_id WHERE ordre.vehicule = ?`, [vehicleId], (err, rows) => {
            if (err) {
                return reject(err);
            }

            let incidentsByPosteHtml = '';
            let currentPoste = '';
            rows.forEach(row => {
                if (row.poste_desc !== currentPoste) {
                    incidentsByPosteHtml += currentPoste ? '</table>' : '';
                    incidentsByPosteHtml += `<h3>${row.poste_desc}</h3><table><tr><th>Incident</th><th>Status</th><th>Order</th></tr>`;
                    currentPoste = row.poste_desc;
                }
                incidentsByPosteHtml += `<tr><td>${row.incident_desc}</td><td>${row.etat}</td><td>${row.ordre_desc}</td></tr>`;
            });
            incidentsByPosteHtml += rows.length ? '</table>' : '<p>No incidents by workstation found.</p>';
            resolve(incidentsByPosteHtml);
        });
    });
}
