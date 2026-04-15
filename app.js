let publicationsData = [];

// Load the flattened JSON data
fetch('publications.json')
    .then(response => response.json())
    .then(data => { publicationsData = data; })
    .catch(error => console.error('Error loading publication data:', error));

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
            const scopusQuery = `TITLE-ABS-KEY(${searchString}) AND ISSN(${pub.ISSN})`;
            const scopusUrl = `https://www.scopus.com/results/results.uri?s=${encodeURIComponent(scopusQuery)}`;
            html += `<a href="${scopusUrl}" target="_blank">Search in Scopus</a>`;
        } 
        else if (pub.database === "ebscohost") {
            const ebscoQuery = `(TI ${searchString} OR AB ${searchString} OR KW ${searchString}) AND IS ${pub.ISSN}`;
            const ebscoUrl = `https://search.ebscohost.com/login.aspx?direct=true&bquery=${encodeURIComponent(ebscoQuery)}`;
            html += `<a href="${ebscoUrl}" target="_blank">Search in EBSCOhost</a>`;
        } 
        else if (pub.database === "proquest") {
            const proquestQuery = `noft(${searchString}) AND issn(${pub.ISSN})`;
            const proquestUrl = `https://www.proquest.com/search/advanced?query=${encodeURIComponent(proquestQuery)}`;
            html += `<a href="${proquestUrl}" target="_blank">Search in ProQuest</a>`;
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