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

    resultsContainer.innerHTML = `<h3>Generated Links (${filteredPubs.length} Publications)</h3>`;

    // 2. Generate exactly one URL per publication based on its assigned database
    filteredPubs.forEach(pub => {
        let html = `<div class="journal-section"><h4>${pub.name}</h4>`;
        
        if (pub.database === "scopus") {
            const scopusQuery = `(ISSN(${pub.ISSN}) AND TITLE-ABS-KEY(${searchString}))`;
            const scopusUrl = `https://www.scopus.com/results/results.uri?s=${encodeURIComponent(scopusQuery)}`;
            html += `<a href="${scopusUrl}" target="_blank">Search in Scopus</a>`;
        }
        else if (pub.database === "ebscohost") {
            // EBSCO Syntax: Added inner parentheses to group the search string safely
            const ebscoQuery = `(TI (${searchString}) OR AB (${searchString}) OR KW (${searchString})) AND IS ${pub.ISSN}`;
            const ebscoUrl = `https://search.ebscohost.com/login.aspx?direct=true&bquery=${encodeURIComponent(ebscoQuery)}`;
            html += `<a href="${ebscoUrl}" target="_blank">Search in EBSCOhost</a>`;
        }
        else if (pub.database === "proquest") {
            // ProQuest Syntax
            const proquestQuery = `noft(${searchString}) AND issn(${pub.ISSN})`;
            const proquestUrl = `https://www.proquest.com/search/advanced`;
            
            // Encode the query safely so it doesn't break the HTML onclick attribute
            const safeQuery = encodeURIComponent(proquestQuery);

            // Create a styled fallback box with the code and a copy button
            html += `
                <div style="background-color: #e9ecef; padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem; border: 1px solid #ced4da;">
                    <div style="font-size: 0.85rem; color: #495057; margin-bottom: 0.5rem;">
                        <strong>ProQuest</strong> (Manual entry required):
                    </div>
                    <code style="display: block; margin-bottom: 0.5rem; word-break: break-word; color: #d63384; background: #fff; padding: 0.25rem; border-radius: 3px; border: 1px solid #dee2e6;">${proquestQuery}</code>
                    <button onclick="copyToClipboard(decodeURIComponent('${safeQuery}'), this)" style="font-size: 0.85rem; padding: 0.25rem 0.5rem;">📋 Copy String</button>
                    <a href="${proquestUrl}" target="_blank" style="display: inline-block; margin-left: 10px; font-size: 0.85rem;">Open ProQuest Advanced Search</a>
                </div>
            `;
        }
        else if (pub.database === "acm") {
            // ACM Syntax: PubIdSortField:(ISSN) AND (Title:(search) OR Abstract:(search) OR Keyword:(search))
            const acmQuery = `PubIdSortField:(${pub.ISSN}) AND (Title:(${searchString}) OR Abstract:(${searchString}) OR Keyword:(${searchString}))`;
            const acmUrl = `https://dl.acm.org/action/doSearch?fillQuickSearch=false&target=advanced&expand=dl&AllField=${encodeURIComponent(acmQuery)}`;
            html += `<a href="${acmUrl}" target="_blank">Search in ACM Digital Library</a>`;
        }
        else {
            html += `<em>No valid database assigned.</em>`;
        }

        html += `</div>`;
        resultsContainer.innerHTML += html;
    });
}