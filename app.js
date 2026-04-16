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
    
    // 1. Get the state of all filters
    const filterAISSeniorScholarPremierJournals = document.getElementById('AISSeniorScholarPremierJournals')?.checked || false;
    const filter_Vhb_2024_WI_APlus = document.getElementById('vhb-2024-WI-A+')?.checked || false;
    const filter_Vhb_2024_WI_A = document.getElementById('vhb-2024-WI-A')?.checked || false;
    const filter_Vhb_2024_WI_B = document.getElementById('vhb-2024-WI-B')?.checked || false;
    
    const resultsContainer = document.getElementById('results');

    if (!searchString) {
        alert("Please enter a search string.");
        return;
    }

    const noFiltersSelected = !filterAISSeniorScholarPremierJournals && 
                              !filter_Vhb_2024_WI_APlus && 
                              !filter_Vhb_2024_WI_A && 
                              !filter_Vhb_2024_WI_B;

    let dbsToRender = [];

    if (noFiltersSelected) {
        // If no filters are selected, prepare an array of the 4 databases with empty publication arrays
        dbsToRender = [
            { db: "scopus", pubs: [] },
            { db: "ebscohost", pubs: [] },
            { db: "proquest", pubs: [] },
            { db: "acm", pubs: [] }
        ];
        resultsContainer.innerHTML = `<h3>Generated Search Strings (All Publications - No Filters Applied)</h3>`;
    } else {
        // 2. Filter using "OR" logic (include if it matches ANY checked filter)
        let filteredPubs = publicationsData.filter(pub => {
            if (filterAISSeniorScholarPremierJournals && pub.isISSeniorScholarBasket) return true;
            if (filter_Vhb_2024_WI_APlus && pub['VHB-2024-WI-rank'] === "A+") return true;
            if (filter_Vhb_2024_WI_A && pub['VHB-2024-WI-rank'] === "A") return true;
            if (filter_Vhb_2024_WI_B && pub['VHB-2024-WI-rank'] === "B") return true;
            return false; // Drop it if it didn't match any selected filter
        });

        if (filteredPubs.length === 0) {
            resultsContainer.innerHTML = `<h3>No publications match your selected filters.</h3>`;
            return;
        }

        // Group the filtered publications by database
        const groupedPubs = filteredPubs.reduce((acc, pub) => {
            const db = pub.database;
            if (db && ["scopus", "ebscohost", "proquest", "acm"].includes(db)) {
                if (!acc[db]) acc[db] = [];
                acc[db].push(pub);
            }
            return acc;
        }, {});

        // Convert the object back into an array for our rendering pipeline
        dbsToRender = Object.entries(groupedPubs).map(([db, pubs]) => ({ db, pubs }));
        resultsContainer.innerHTML = `<h3>Generated Search Strings (${filteredPubs.length} Publications)</h3>`;
    }

    // 3. Unifed Rendering Loop
    dbsToRender.forEach(({ db, pubs }) => {
        let dbName = "";
        let query = "";
        let url = "";
        
        // A boolean flag to determine if we are injecting ISSNs
        const hasPubs = pubs.length > 0;

        // Build the specific query string for each database
        if (db === "scopus") {
            dbName = "Scopus";
            if (hasPubs) {
                const issnString = pubs.map(p => `ISSN(${p.ISSN})`).join(' OR ');
                query = `((${issnString}) AND TITLE-ABS-KEY(${searchString}))`;
            } else {
                query = `TITLE-ABS-KEY(${searchString})`;
            }
            url = `https://www.scopus.com/results/results.uri?s=${encodeURIComponent(query)}`;
        } 
        else if (db === "ebscohost") {
            dbName = "EBSCOhost";
            if (hasPubs) {
                const issnString = pubs.map(p => `IS ${p.ISSN}`).join(' OR ');
                query = `((${issnString}) AND (TI (${searchString}) OR AB (${searchString}) OR KW (${searchString})))`;
            } else {
                query = `(TI (${searchString}) OR AB (${searchString}) OR KW (${searchString}))`;
            }
            url = `https://search.ebscohost.com/login.aspx?direct=true&bquery=${encodeURIComponent(query)}`;
        } 
        else if (db === "proquest") {
            dbName = "ProQuest";
            if (hasPubs) {
                const issnString = pubs.map(p => `issn(${p.ISSN})`).join(' OR ');
                query = `noft(${searchString}) AND (${issnString})`;
            } else {
                query = `noft(${searchString})`;
            }
            url = `https://www.proquest.com/search/advanced`;
        } 
        else if (db === "acm") {
            dbName = "ACM Digital Library";
            if (hasPubs) {
                const issnString = pubs.map(p => `PubIdSortField:(${p.ISSN})`).join(' OR ');
                query = `((${issnString}) AND (Title:(${searchString}) OR Abstract:(${searchString}) OR Keyword:(${searchString})))`;
            } else {
                query = `(Title:(${searchString}) OR Abstract:(${searchString}) OR Keyword:(${searchString}))`;
            }
            url = `https://dl.acm.org/action/doSearch?fillQuickSearch=false&target=advanced&expand=dl&AllField=${encodeURIComponent(query)}`;
        }

        const safeQuery = encodeURIComponent(query);
        
        // Dynamically build the header area depending on whether filters were applied
        let publicationsInfoHtml = "";
        if (hasPubs) {
            const journalListHtml = pubs.map(p => `<li style="margin-bottom: 0.25rem;">${p.name} (ISSN: ${p.ISSN})</li>`).join('');
            publicationsInfoHtml = `
                <strong style="color: #495057;">Included Publications (${pubs.length}):</strong>
                <ul style="font-size: 0.9rem; color: #495057; margin-top: 0.5rem; padding-left: 1.5rem;">
                    ${journalListHtml}
                </ul>
            `;
        } else {
            publicationsInfoHtml = `
                <strong style="color: #0056b3;">Searching globally in database (No journal filters applied).</strong>
            `;
        }

        // Generate the HTML block for this database
        let html = `
            <div class="journal-section" style="margin-bottom: 2rem; padding: 1.5rem; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px;">
                <h4 style="margin-top: 0; font-size: 1.25rem; color: #343a40; border-bottom: 2px solid #0056b3; padding-bottom: 0.5rem;">${dbName}</h4>
                
                <div style="margin-bottom: 1rem;">
                    ${publicationsInfoHtml}
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
    });
}