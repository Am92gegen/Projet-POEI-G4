-- SQLite
---------------------- Création de la bdd -------------------------------------

BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "vehicule" (
	"vehicule_id"	INTEGER NOT NULL,
	"vehicule_desc"	TEXT NOT NULL,
	PRIMARY KEY("vehicule_id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "poste" (
	"poste_id"	INTEGER NOT NULL,
	"poste_desc"	TEXT NOT NULL,
	PRIMARY KEY("poste_id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "ordre" (
	"ordre_id"	INTEGER NOT NULL,
	"ordre_desc"	TEXT NOT NULL,
	"poste"	INTEGER NOT NULL,
	"vehicule"	INTEGER NOT NULL,
	PRIMARY KEY("ordre_id" AUTOINCREMENT),
	FOREIGN KEY("vehicule") REFERENCES "vehicule"("vehicule_id"),
	FOREIGN KEY("poste") REFERENCES "poste"("poste_id")
);
CREATE TABLE IF NOT EXISTS "incident" (
	"incident_id"	INTEGER NOT NULL,
	"incident_desc"	TEXT NOT NULL,
	"ordre"	INTEGER NOT NULL,
	"etat"	TEXT NOT NULL,
	PRIMARY KEY("incident_id" AUTOINCREMENT),
	FOREIGN KEY("ordre") REFERENCES "ordre"("ordre_id")
);

------------------- Alimentation de la bdd ------------------------------

-------- Alimentation faite par INETUM -------------------------------

INSERT INTO "vehicule" ("vehicule_id","vehicule_desc") VALUES (0,'vehicule4');
INSERT INTO "vehicule" ("vehicule_id","vehicule_desc") VALUES (1,'vehicule1');
INSERT INTO "vehicule" ("vehicule_id","vehicule_desc") VALUES (2,'vehicule2');
INSERT INTO "vehicule" ("vehicule_id","vehicule_desc") VALUES (3,'vehicule3');
INSERT INTO "poste" ("poste_id","poste_desc") VALUES (0,'');
INSERT INTO "poste" ("poste_id","poste_desc") VALUES (1,'poste1');
INSERT INTO "poste" ("poste_id","poste_desc") VALUES (2,'poste2');
INSERT INTO "poste" ("poste_id","poste_desc") VALUES (3,'poste3');
INSERT INTO "ordre" ("ordre_id","ordre_desc","poste","vehicule") VALUES (1,'ordre1_poste1_vehicule1',1,1);
INSERT INTO "ordre" ("ordre_id","ordre_desc","poste","vehicule") VALUES (2,'ordre2_poste1_vehicule2',1,2);
INSERT INTO "ordre" ("ordre_id","ordre_desc","poste","vehicule") VALUES (3,'ordre3_poste2_vehicule1',2,1);
INSERT INTO "ordre" ("ordre_id","ordre_desc","poste","vehicule") VALUES (4,'ordre4_poste3_vehicule2',3,2);
INSERT INTO "ordre" ("ordre_id","ordre_desc","poste","vehicule") VALUES (5,'ordre5_poste2_vehicule2',2,2);
INSERT INTO "incident" ("incident_id","incident_desc","ordre","etat") VALUES (1,'incident1_ordre1',1,'OPEN');
INSERT INTO "incident" ("incident_id","incident_desc","ordre","etat") VALUES (2,'incident2_ordre2',2,'OPEN');
INSERT INTO "incident" ("incident_id","incident_desc","ordre","etat") VALUES (3,'incident3_ordre2',2,'OPEN');
INSERT INTO "incident" ("incident_id","incident_desc","ordre","etat") VALUES (4,'incident4_ordre4',4,'OPEN');
INSERT INTO "incident" ("incident_id","incident_desc","ordre","etat") VALUES (5,'incident5_ordre4',4,'OPEN');


--------------- Alimentation faite par nous pour la table vehicule ----------------------------

INSERT INTO vehicule (vehicule_desc)
VALUES
    ('Citroën C1'),
    ('Ford Cougar'),
    ('Ford B MAX'),
    ('Chevrolet Camaro 5'),
    ('Nissan QASHQAI'),
    ('Hyundai IONIQ 6'),
    ('Kia Sportage'),
    ('Volkswagen T-Roc Cabriolet Style'),
    ('Ford Cougar'),
    ('Mazda CX-60'),
    ('Audi Q5 Sportback'),
    ('BMW iX1'),
    ('Mercedes-Benz GLA'),
    ('Audi A5 Cabriolet'),
    ('Audi Q4 e-tron'),
    ('Ford Edge'),
    ('Chevrolet Corvette C3'),
    ('Jeep Wrangler 4xe'),
    ('Toyota 2.0 Turbo'),
    ('Honda E');

------------- Update des valeurs de base ----------------------

UPDATE vehicule
SET vehicule_desc = 'Audi A5 Coupé'
WHERE vehicule_id = 0;

UPDATE vehicule
SET vehicule_desc = 'Toyota Auris'
WHERE vehicule_id = 1;

UPDATE vehicule
SET vehicule_desc = 'Opel Astra GTC'
WHERE vehicule_id = 2;

UPDATE vehicule
SET vehicule_desc = 'Dacia Duster'
WHERE vehicule_id = 3;



-------------- Alimentation de la table poste ----------------------------

INSERT INTO poste (poste_desc)
VALUES
    ("Poste de soudage"),
    ("Ligne d'assemblage 1"),
    ("Ligne d'assemblage 2"),
    ("Poste de peinture"),
    ("Poste de contrôle qualité"),
    ("Poste de test électrique"),
    ("Poste de finition"),
    ("Poste d'emballage"),
    ("Poste de maintenance"),
    ("Poste d'inspection visuelle"),
    ("Poste d'assemblage des composants"),
    ("Poste de programmation"),
    ("Poste de test de sécurité"),
    ("Poste de calibrage"),
    ("Poste d'installation des capteurs"),
    ("Poste d'assemblage final"),
    ("Poste de contrôle des paramètres"),
    ("Poste de nettoyage"),
    ("Poste d'assemblage 3"),
    ("Poste de test de performance"),
    ("Poste de montage des roues"),
    ("Poste de contrôle qualité final");

------------- Update des valeurs de base ----------------------

--UPDATE poste
--SET poste_desc = 'Poste de test électronique'
--WHERE poste_id = 0;

UPDATE poste
SET poste_desc = 'Poste de montage des sièges'
WHERE poste_id = 1;

UPDATE poste
SET poste_desc = 'Poste de finition extérieure'
WHERE poste_id = 2;

UPDATE poste
SET poste_desc = 'Poste de test de peinture'
WHERE poste_id = 3;


----------- Alimentation de la table ordre -----------------------------

INSERT INTO ordre (ordre_desc, poste, vehicule)
VALUES
    ('Montage des roues', 24, 6),
    ('Test de freinage', 16, 7),
    ("Installation de l'électronique", 9, 10),
    ('Peinture intérieure', 7, 12),
    ('Assemblage des portes', 14, 4),
    ('Inspection qualité', 8, 15),
    ('Montage des phares', 6, 9),
    ('Installation du système audio', 18, 3),
    ('Vérification des pneus', 4, 21),
    ('Assemblage du châssis', 19, 14),
    ("Test d'airbag", 5, 17),
    ('Peinture extérieure', 2, 18),
    ('Assemblage des ceintures de sécurité', 3, 16),
    ('Installation des vitres', 2, 22),
    ('Test de climatisation', 23, 23),
    ('Vérification de l''éclairage', 10, 24),
    ('Assemblage du tableau de bord', 22, 19),
    ('Test de GPS', 15, 13),
    ('Installation des rétroviseurs', 5, 20),
    ('Test de suspension', 4, 25);

------------- Update des valeurs de base ----------------------

--UPDATE poste
--SET poste_desc = 'Poste de test électronique'
--WHERE poste_id = 0;

UPDATE ordre
SET ordre_desc = 'Montage des sièges avant'
WHERE ordre_id = 1;

UPDATE ordre
SET ordre_desc = 'Montage des sièges arrière'
WHERE ordre_id = 2;

UPDATE ordre
SET ordre_desc = 'Peinture extérieure spéciale'
WHERE ordre_id = 3;

UPDATE ordre
SET ordre_desc = 'Correction des défauts de peinture'
WHERE ordre_id = 4;

UPDATE ordre
SET ordre_desc = 'Nettoyage final extérieur'
WHERE ordre_id = 5;

----------- Alimentation de la table incident -----------------------------

INSERT INTO incident (incident_desc, ordre, etat)
VALUES
    ('Panne mécanique des machines', 12, "OPEN"),
    ('Panne électriques', 8, "OPEN"),
    ("Défaillance d'un robot de soudage", 6, "OPEN"),
    ('Pénurie de piéce', 10, "OPEN"),
    ("Panne de l'unité de peinture", 3, "CLOSED"),
    ('Panne du système de refroidissement', 13, "OPEN"),
    ('Gréve Travailleurs', 5, "OPEN"),
    ('Accidents de Travail', 15, "OPEN"),
    ("Panne du système d'assemblage automatisé", 22, "OPEN"),
    ('Problèmes de formation du personnel', 13, "CLOSED"),
    ('Panne du système de logistique interne', 1, "OPEN"),
    ('Défaillance des systèmes de sécurité', 18, "OPEN"),
    ('Pannes des systèmes de refroidissement ou de climatisation', 20, "OPEN"),
    ('Panne du système de contrôle de qualité', 11, "OPEN"),
    ('Panne du système de montage des moteurs', 22, "CLOSED"),
    ("Panne de l'unité d'assemblage des sièges", 2, "CLOSED"),
    ('Panne du système de contrôle des émissions', 16, "OPEN"),
    ('Panne du système de contrôle des lumières', 19, "OPEN"),
    ('Panne du système de test de freinage', 25, "OPEN"),
    ('Panne du système de contrôle de navigation', 22, "OPEN"),
    ("Panne du système d'inspection de la carrosserie", 12, "OPEN");

------------- Update des valeurs de base ----------------------

--UPDATE poste
--SET poste_desc = 'Poste de test électronique'
--WHERE poste_id = 0;

UPDATE incident
SET incident_desc = 'Panne mécanique des machines'
WHERE incident_id = 1;

UPDATE incident
SET incident_desc = 'Panne mécanique des machines'
WHERE incident_id = 2;

UPDATE incident
SET incident_desc = "Panne de l'unité de peinture"
WHERE incident_id = 3;

UPDATE incident
SET incident_desc = "Panne de l'unité de peinture"
WHERE incident_id = 4;

UPDATE incident
SET incident_desc = "Panne de l'unité de peinture"
WHERE incident_id = 5;

COMMIT;