
document.addEventListener("DOMContentLoaded", function() {

    // Interaction avec le champs SQL
    const sqlQueryTextArea = document.getElementById("sql-query");

    // Interaction avec le tableau de données
    const resultsTableBody = document.querySelector(".table-section table tbody");

    sqlQueryTextArea.addEventListener("blur", function() {
        
        // Simuler l'extraction des données depuis la requête SQL
        // Ici, nous prétendons juste obtenir des résultats
        
        const simulatedResults = [
            { column1: "Donnée A", column2: "Donnée B" },
            { column1: "Donnée C", column2: "Donnée D" }
        ];

        updateTableWithResults(simulatedResults);
    });

    function updateTableWithResults(results) {
        let tableContent = '';

        results.forEach(row => {
            tableContent += `<tr>
                <td>${row.column1}</td>
                <td>${row.column2}</td>
            </tr>`;
        });

        resultsTableBody.innerHTML = tableContent;
    }
});