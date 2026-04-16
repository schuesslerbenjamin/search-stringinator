let publicationsData = [];

// Load the flattened JSON data
fetch('publications.json')
    .then(response => response.json())
    .then(data => { publicationsData = data; })
    .catch(error => console.error('Error loading publication data:', error));

function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerText;
        btn.innerText = "✅ Copied!";
        setTimeout(() => { btn.innerText = originalText; }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

function generateLinks() {
    const searchString = document.getElementById('searchString').value.trim();
    
    const filterBasket = document.getElementById('basketOf8').checked;
    const filterVhbA = document.getElementById('vhbA').checked;
    const resultsContainer = document.getElementById('results');

    if (!searchString) {
        alert("Please enter a search string.");
        return;
    }

    // 1. Filter the publications 
    let filteredPubs = publicationsData.filter(pub => {
        let keep = true;
        if (filterBasket && !pub.isISSeniorScholarBasket) keep = false;
        if (filterVhbA && pub['VHB-2024-WI-rank'] !== "A") keep = false;
        return keep;
    });

    if (filteredPubs.length === 0) {
        resultsContainer.innerHTML = `<h3>No publications match your filters.</h3>`;
        return;
    }

    // 2. Group the filtered publications by database
    const groupedPubs = filteredPubs.reduce((acc, pub) => {
        const db = pub.database;
        // Ignore publications with no valid database assigned
        if (db && ["scopus", "ebscohost", "proquest", "acm"].includes(db)) {
            if (!acc[db]) acc[db] = [];
            acc[db].push(pub);
        }
        return acc;
    }, {});

    // 3. Render the UI
    resultsContainer.innerHTML = `<h3>Generated Search Strings (${filteredPubs.length} Publications)</h3>`;

    // Iterate over each database bucket
    for (const [db, pubs] of Object.entries(groupedPubs)) {
        
        let dbName = "";
        let query = "";
        let url = "";

        // Build the specific query string for each database
        if (db === "scopus") {
            dbName = "Scopus";
            const issnString = pubs.map(p => `ISSN(${p.ISSN})`).join(' OR ');
            query = `((${issnString}) AND TITLE-ABS-KEY(${searchString}))`;
            url = `https://www.scopus.com/results/results.uri?s=${encodeURIComponent(query)}`;
        } 
        else if (db === "ebscohost") {
            dbName = "EBSCOhost";
            const issnString = pubs.map(p => `IS ${p.ISSN}`).join(' OR ');
            query = `((${issnString}) AND (TI (${searchString}) OR AB (${searchString}) OR KW (${searchString})))`;
            url = `https://search.ebscohost.com/login.aspx?direct=true&bquery=${encodeURIComponent(query)}`;
        } 
        else if (db === "proquest") {
            dbName = "ProQuest";
            const issnString = pubs.map(p => `issn(${p.ISSN})`).join(' OR ');
            query = `noft(${searchString}) AND (${issnString})`;
            // ProQuest doesn't support complex URLs, point to Advanced Search
            url = `https://www.proquest.com/search/advanced`;
        } 
        else if (db === "acm") {
            dbName = "ACM Digital Library";
            const issnString = pubs.map(p => `PubIdSortField:(${p.ISSN})`).join(' OR ');
            query = `((${issnString}) AND (Title:(${searchString}) OR Abstract:(${searchString}) OR Keyword:(${searchString})))`;
            url = `https://dl.acm.org/action/doSearch?fillQuickSearch=false&target=advanced&expand=dl&AllField=${encodeURIComponent(query)}`;
        }

        const safeQuery = encodeURIComponent(query);
        const journalListHtml = pubs.map(p => `<li style="margin-bottom: 0.25rem;">${p.name} (ISSN: ${p.ISSN})</li>`).join('');

        // Generate the HTML block for this database
        let html = `
            <div class="journal-section" style="margin-bottom: 2rem; padding: 1.5rem; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px;">
                <h4 style="margin-top: 0; font-size: 1.25rem; color: #343a40; border-bottom: 2px solid #0056b3; padding-bottom: 0.5rem;">${dbName}</h4>
                
                <div style="margin-bottom: 1rem;">
                    <strong style="color: #495057;">Included Publications (${pubs.length}):</strong>
                    <ul style="font-size: 0.9rem; color: #495057; margin-top: 0.5rem; padding-left: 1.5rem;">
                        ${journalListHtml}
                    </ul>
                </div>

                <div style="background-color: #fff; padding: 1rem; border-radius: 4px; border: 1px solid #ced4da;">
                    <div style="font-size: 0.85rem; color: #6c757d; margin-bottom: 0.5rem; text-transform: uppercase; font-weight: bold;">
                        Search String
                    </div>
                    <code style="display: block; margin-bottom: 1rem; word-break: break-word; color: #d63384; background: #f8f9fa; padding: 0.75rem; border-radius: 4px; border: 1px solid #e9ecef; font-size: 0.9rem;">${query}</code>
                    
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <button onclick="copyToClipboard(decodeURIComponent('${safeQuery}'), this)" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold; transition: 0.2s;">📋 Copy String</button>
                        <a href="${url}" target="_blank" style="padding: 0.5rem 1rem; background: #0056b3; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; transition: 0.2s;">↗️ Open in ${dbName}</a>
                    </div>
                    ${db === 'proquest' ? `<div style="font-size: 0.8rem; color: #dc3545; margin-top: 0.75rem;"><em>Note: ProQuest requires you to manually copy and paste the string into their Advanced Search page.</em></div>` : ''}
                </div>
            </div>
        `;
        
        resultsContainer.innerHTML += html;
    }
}