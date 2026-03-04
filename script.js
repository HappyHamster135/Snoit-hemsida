// ==========================================
// --- KONFIGURATION OCH GLOBALA VARIABLER ---
// ==========================================

const searchInput = document.getElementById('resortSearch');
const resortList = document.getElementById('resortList');
let selectedResort = null;

// Konfiguration för anslutning till backend-servern (Render)
const CONFIG = {
    // Klistra in din nya Render-URL här (inga snedstreck på slutet)
    SERVER_BASE_URL: "https://snoit-hemsida.onrender.com" 
};
const SERVER_BASE_URL = CONFIG.SERVER_BASE_URL;

// Referenser och status för underområdes-flikarna (t.ex. Lindvallen, Hundfjället)
const subAreaTabsContainer = document.getElementById('subAreaTabs');
let selectedSubAreaIndex = 0; // Standard till första fliken (index 0)


// ==========================================
// --- LOKAL CACHE-HANTERING ---
// ==========================================

// Sparar hämtad data i webbläsarens lokala minne för att minska laddningstider
function saveToCache(key, data) {
    const cacheEntry = {
        timestamp: new Date().getTime(),
        content: data
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
}

// Hämtar sparad data från webbläsarens lokala minne
function getFromCache(key) {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
}

// Allmän hjälpfunktion för att säkert uppdatera text i ett HTML-element
function updateText(id, text, isHtml = false) {
    const el = document.getElementById(id);
    if (el) {
        if (isHtml) el.innerHTML = text; 
        else el.innerText = text;
    }
}

// ==========================================
// --- UI-RENDERING: FLIKAR OCH VÄDER ---
// ==========================================

// Bygger upp knapparna/flikarna för orter med underområden (t.ex. Sälen -> Lindvallen)
function renderSubAreaTabs(subAreas) {
    const tabsContainer = document.getElementById('subAreaTabs');
    if (!tabsContainer) return; 
    
    tabsContainer.innerHTML = ""; 

    subAreas.forEach((sub, index) => {
        const button = document.createElement('button');
        button.className = 'tab-btn';
        if (index === selectedSubAreaIndex) {
            button.classList.add('is-active');
        }
        button.innerText = sub.name;

        // Hantera klick på en specifik flik
        button.onclick = () => {
            selectedSubAreaIndex = index;
            
            // Visuell uppdatering av aktiv flik
            const allTabs = tabsContainer.querySelectorAll('.tab-btn');
            allTabs.forEach(t => t.classList.remove('is-active'));
            button.classList.add('is-active');
            button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

            // Trigga en ny sökning automatiskt för det valda området
            document.getElementById('searchBtn').click();
        };

        tabsContainer.appendChild(button);
    });
}

// Fyller i väderinformationen i gränssnittet baserat på data från Open-Meteo
function renderWeatherData(data, isOffline = false, timestamp = null) {
    let depthCm = Math.round((data.current.snow_depth || 0) * 100);
    
    updateText('snowDepth', `${depthCm}<span class="unit">cm</span>`, true);
    updateText('labelSnow', "Terräng");
    updateText('pisteDepth', `~${depthCm + 45}<span class="unit">cm</span>`, true);
    updateText('labelPiste', "Pist");
    updateText('weatherIcon', getWeatherEmoji(data.current.weather_code));
    
    // Visar om datan är live eller hämtad från cache (offline-läge)
    if (isOffline && timestamp) {
        const timeStr = new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        updateText('weatherDesc', `Offline (Hämtat ${timeStr})`);
    } else {
        updateText('weatherDesc', getWeatherDesc(data.current.weather_code));
    }

    updateText('valleyTemp', data.current.temperature_2m + "°");
    updateText('valleyWind', Math.round(data.current.wind_speed_10m) + " m/s");
    updateText('valleyLabel', "Dal");
    updateText('topLabel', "Topp");
}


// ==========================================
// --- KARTDATA (KOORDINATER FÖR LIFTAR/PISTER) ---
// ==========================================

const hundfjalletMap = [
    { name: "väggen", left: 20.82, top: 34.08 },
    { name: "worldcupbacken", left: 22.21, top: 40.96 },
    { name: "branten", left: 28.32, top: 53.44 },
    { name: "göstabacken", left: 31.95, top: 54.83 },
    { name: "granbacken", left: 65.81, top: 16.66 },
    { name: "källbacken", left: 69.34, top: 21.78 },
    { name: "sixtenbacken", left: 79.05, top: 30.41 },
    { name: "långbacken-1", left: 77.81, top: 34.72 },
    { name: "långbacken-2", left: 75.39, top: 44.22 },
    { name: "långbacken-3", left: 81.23, top: 47.07 },
    { name: "långbacken-4", left: 82.75, top: 55.19 },
    { name: "fjällfen", left: 90.60, top: 51.02 },
    { name: "näsbacken", left: 97.67, top: 47.80 },
    { name: "familjebacken", left: 35.70, top: 42.90 },
    { name: "ljungbacken", left: 40.74, top: 26.63 },
    { name: "ravinbacke-2", left: 45.74, top: 24.10 },
    { name: "ravinbacke-1", left: 48.28, top: 20.27 },
    { name: "lätta-nedfarten", left: 38.20, top: 35.59 },
    { name: "barnbacken", left: 43.49, top: 73.97 },
    { name: "skidskolebacken", left: 52.69, top: 59.00 },
    { name: "trollskogen", left: 60.86, top: 42.55 },
    { name: "myrstigen", left: 69.57, top: 77.54 },
    { name: "vita-ringen", left: 75.15, top: 29.59 },
    { name: "rullband-hundfjällstorget", left: 39.50, top: 82.84 },
    { name: "rullband-trollbäckstorget", left: 52.66, top: 91.24 },
    { name: "vinkelliften", left: 25.90, top: 76.41 },
    { name: "barnliften", left: 34.37, top: 79.73 },
    { name: "bredas-lift", left: 48.66, top: 68.34 },
    { name: "trollliften", left: 49.52, top: 89.91 },
    { name: "lines-lift", left: 57.83, top: 90.79 },
    { name: "förbindelseliften", left: 19.10, top: 77.34 },
    { name: "kvarten-1", left: 41.50, top: 86.12 },
    { name: "kvarten-2", left: 41.47, top: 85.97 },
    { name: "grytanliften", left: 60.50, top: 26.71 },
    { name: "ravinliften-1", left: 58.19, top: 32.34 },
    { name: "ravinliften-2", left: 58.17, top: 32.39 },
    { name: "toppliften", left: 50.84, top: 54.37 },
    { name: "lången-1", left: 56.96, top: 75.30 },
    { name: "lången-2", left: 56.96, top: 75.30 },
    { name: "lavenliften", left: 88.64, top: 94.85 },
    { name: "väggenbanan", left: 3.56, top: 60.05 },
    { name: "east-express", left: 19.47, top: 83.18 },
    { name: "west-express-by-nordea", left: 33.10, top: 85.77 }
];

const hogfjalletMap = [
    { name: "musse", left: 36.87, top: 43.85 },
    { name: "skutt", left: 37.34, top: 47.90 },
    { name: "bamse", left: 39.23, top: 52.40 },
    { name: "putte", left: 41.40, top: 56.18 },
    { name: "arne", left: 44.42, top: 60.57 },
    { name: "åsa", left: 79.65, top: 36.82 },
    { name: "kent", left: 88.22, top: 37.68 },
    { name: "tina", left: 72.86, top: 24.84 },
    { name: "mats", left: 78.85, top: 27.39 },
    { name: "rullband-högfjället", left: 42.69, top: 46.35 },
    { name: "älgen", left: 21.31, top: 35.37 },
    { name: "illern", left: 49.79, top: 51.33 },
    { name: "mården", left: 44.73, top: 49.97 },
    { name: "minken-1", left: 49.38, top: 55.01 },
    { name: "minken-2", left: 49.38, top: 54.95 },
    { name: "bävern", left: 49.34, top: 60.83 },
    { name: "järven", left: 50.49, top: 83.76 },
    { name: "björnen", left: 50.17, top: 88.17 },
    { name: "räven", left: 44.09, top: 86.53 },
    { name: "vesslan", left: 32.67, top: 20.26 },
    { name: "vargen-1", left: 51.45, top: 54.67 },
    { name: "vargen-2", left: 51.45, top: 54.67 },
    { name: "renen", left: 33.40, top: 22.07 }
];

const lindvallenMap = [
    { name: "adam", left: 5.57, top: 36.86 },
    { name: "pernilla", left: 10.95, top: 36.54 },
    { name: "stina", left: 35.65, top: 25.51 },
    { name: "daniel", left: 14.52, top: 27.26 },
    { name: "eva", left: 17.46, top: 30.76 },
    { name: "ville", left: 20.82, top: 38.66 },
    { name: "johan", left: 26.74, top: 27.55 },
    { name: "ulla", left: 28.96, top: 31.41 },
    { name: "olle", left: 39.41, top: 41.43 },
    { name: "lotta", left: 43.27, top: 39.70 },
    { name: "lisa", left: 48.08, top: 35.21 },
    { name: "karin", left: 78.22, top: 43.54 },
    { name: "hasse", left: 81.30, top: 41.22 },
    { name: "uffe", left: 87.90, top: 38.99 },
    { name: "sigge", left: 90.43, top: 41.35 },
    { name: "jonas", left: 93.09, top: 38.19 },
    { name: "emma", left: 97.25, top: 36.05 },
    { name: "märta", left: 23.74, top: 35.09 },
    { name: "lasse", left: 32.58, top: 28.59 },
    { name: "nisse", left: 44.64, top: 34.59 },
    { name: "gustav", left: 53.83, top: 33.65 },
    { name: "tomas", left: 85.16, top: 39.57 },
    { name: "oskar", left: 75.31, top: 52.43 },
    { name: "frida", left: 26.09, top: 73.93 },
    { name: "ola", left: 27.74, top: 75.22 },
    { name: "kajsa", left: 29.80, top: 78.34 },
    { name: "anna", left: 33.11, top: 77.23 },
    { name: "moa", left: 37.82, top: 77.27 },
    { name: "hugo", left: 38.35, top: 74.46 },
    { name: "elin", left: 40.51, top: 64.84 },
    { name: "åke", left: 42.86, top: 64.70 },
    { name: "lena", left: 46.10, top: 63.72 },
    { name: "ida", left: 47.70, top: 65.02 },
    { name: "pelle", left: 49.91, top: 67.42 },
    { name: "lina", left: 53.14, top: 70.27 },
    { name: "vallebacken", left: 72.14, top: 30.07 },
    { name: "snögubbedalen", left: 71.53, top: 65.03 },
    { name: "lelle", left: 88.95, top: 73.92 },
    { name: "jenny", left: 15.82, top: 59.62 },
    { name: "per", left: 17.07, top: 61.05 },
    { name: "vallentorget", left: 25.64, top: 60.25 },
    { name: "rullband-söderåstorget", left: 9.30, top: 75.80 },
    { name: "rullband-valleberget-1", left: 21.64, top: 80.78 },
    { name: "rullband-valleberget-2", left: 23.27, top: 82.29 },
    { name: "rullband-valleberget-3", left: 32.38, top: 68.74 },
    { name: "rullband-korpen", left: 48.26, top: 72.90 },
    { name: "rullband-sälfjällstorget", left: 98.31, top: 67.92 },
    { name: "sydpolen", left: 5.69, top: 73.66 },
    { name: "måsen", left: 21.78, top: 70.70 },
    { name: "sparven", left: 30.89, top: 66.35 },
    { name: "tranan", left: 19.55, top: 79.46 },
    { name: "svalan", left: 25.36, top: 83.17 },
    { name: "ugglan-1", left: 31.60, top: 84.94 },
    { name: "ugglan-2", left: 31.60, top: 84.94 },
    { name: "kråkan", left: 35.07, top: 85.19 },
    { name: "duvan-1", left: 41.63, top: 82.92 },
    { name: "duvan-2", left: 41.81, top: 82.98 },
    { name: "gladan", left: 41.56, top: 78.26 },
    { name: "höken", left: 43.86, top: 70.57 },
    { name: "ripan-1", left: 46.42, top: 72.84 },
    { name: "ripan-2", left: 46.49, top: 72.96 },
    { name: "korpen", left: 49.54, top: 73.47 },
    { name: "nordpolen", left: 52.41, top: 75.55 },
    { name: "lärkan", left: 54.78, top: 79.52 },
    { name: "trasten", left: 68.18, top: 83.17 },
    { name: "kajan", left: 72.22, top: 75.86 },
    { name: "haren", left: 90.20, top: 70.51 },
    { name: "kaninen", left: 88.46, top: 77.88 },
    { name: "pingvinen", left: 96.04, top: 71.39 },
    { name: "vråken-1", left: 29.01, top: 62.63 },
    { name: "vråken-2", left: 29.01, top: 62.63 },
    { name: "örnen-1", left: 38.09, top: 67.92 },
    { name: "örnen-2", left: 38.16, top: 67.92 },
    { name: "orren-1", left: 56.63, top: 75.23 },
    { name: "orren-2", left: 56.63, top: 75.23 },
    { name: "orren-3", left: 56.63, top: 75.23 },
    { name: "tjädern-1", left: 68.18, top: 75.61 },
    { name: "tjädern-2", left: 68.18, top: 75.61 },
    { name: "falken", left: 78.46, top: 71.33 },
    { name: "fasanen-1", left: 96.08, top: 71.45 },
    { name: "fasanen-2", left: 96.08, top: 71.45 },
    { name: "uven", left: 7.25, top: 62.00 },
    { name: "söderåsen-express", left: 1.08, top: 75.42 },
    { name: "experium-express", left: 20.50, top: 73.03 },
    { name: "gustav-express", left: 70.44, top: 81.67  }
];

const tandadalenMap = [
    { name: "svansen", left: 32.15, top: 25.03 },
    { name: "puckeln", left: 56.87, top: 48.84 },
    { name: "specialen", left: 59.53, top: 51.79 },
    { name: "stora-backen", left: 60.85, top: 31.70 },
    { name: "hanget", left: 68.20, top: 36.87 },
    { name: "stjärnfallet", left: 70.27, top: 28.30 },
    { name: "kometen", left: 77.89, top: 28.03 },
    { name: "myrbacken", left: 40.72, top: 31.25 },
    { name: "flatfjällsbacken", left: 41.01, top: 36.91 },
    { name: "åsbacken", left: 43.53, top: 34.96 },
    { name: "kalvåsbacken", left: 45.85, top: 36.96 },
    { name: "blixten", left: 56.10, top: 55.65 },
    { name: "gusjöbacken", left: 28.70, top: 32.93 },
    { name: "killybacken", left: 32.75, top: 33.68 },
    { name: "femåbacken", left: 36.40, top: 30.91 },
    { name: "snösvängen", left: 36.77, top: 36.00 },
    { name: "kröken/fun-ride", left: 49.19, top: 63.20 },
    { name: "skogsbacken", left: 54.15, top: 61.34 },
    { name: "solbacken", left: 81.97, top: 57.05 },
    { name: "albacken", left: 84.78, top: 46.22 },
    { name: "pulsen", left: 3.91, top: 65.49 },
    { name: "barnbacken", left: 9.78, top: 56.55 },
    { name: "familjebacken", left: 52.74, top: 34.94 },
    { name: "barnens-fjäll", left: 63.81, top: 83.39 },
    { name: "barnområdet", left: 79.00, top: 70.54 },
    { name: "rullband-östra-tandådalen", left: 7.16, top: 59.57 },
    { name: "rullband-skidskoleliften", left: 71.98, top: 87.93 },
    { name: "rullband-tandådalstorget", left: 75.39, top: 89.25 },
    { name: "rullband-tandådalen-express", left: 89.06, top: 83.79 },
    { name: "barnliften-östra", left: 6.75, top: 61.77 },
    { name: "transportliften-östra", left: 7.31, top: 65.62 },
    { name: "kalvenliften", left: 40.97, top: 73.78 },
    { name: "skidskoleliften-1", left: 71.49, top: 84.99 },
    { name: "skidskoleliften-2", left: 71.49, top: 84.99 },
    { name: "teknikliften-1", left: 81.01, top: 77.24 },
    { name: "teknikliften-2", left: 81.01, top: 77.24 },
    { name: "barnliften", left: 82.00, top: 76.38 },
    { name: "topplänken", left: 40.09, top: 21.95 },
    { name: "tunnelliften", left: 96.95, top: 90.51 },
    { name: "förbindelseliften", left: 97.78, top: 89.11 },
    { name: "kotten", left: 76.43, top: 96.49 },
    { name: "östliften-1", left: 10.94, top: 63.16 },
    { name: "östliften-2", left: 10.94, top: 63.16 },
    { name: "kvilliften", left: 21.71, top: 82.71 },
    { name: "norrliften-1", left: 34.73, top: 82.14 },
    { name: "norrliften-2", left: 34.73, top: 82.14 },
    { name: "parliften-1", left: 76.34, top: 81.72 },
    { name: "parliften-2", left: 76.34, top: 81.57 },
    { name: "solliften", left: 92.46, top: 65.71 },
    { name: "pulsen-express", left: 10.41, top: 68.85 },
    { name: "tandådalen-express", left: 87.55, top: 85.35 },
    { name: "tandådalen-big-air-arena", left: 66.21, top: 60.90 },
    { name: "skistar-snow-park-red", left: 44.79, top: 54.38 },
    { name: "skistar-snow-park-blue", left: 46.23, top: 58.91 }
];


// ==========================================
// --- DATABAS ÖVER SKIDORTER ---
// ==========================================

// Lista över alla tillgängliga orter, deras koordinater och specifika Skistar-URL:er
const vipResorts = [
    { 
        name: "Sälen", country: "Sverige",
        subAreas: [
            { name: "Lindvallen", lat: 61.150, lon: 13.266, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/salen/vinter-i-salen/vader-och-backar/lindvallen/SimpleView/" },
            { name: "Hundfjället", lat: 61.160, lon: 12.986, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/salen/vinter-i-salen/vader-och-backar/hundfjallet/SimpleView/" },
            { name: "Tandådalen", lat: 61.173, lon: 13.003, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/salen/vinter-i-salen/vader-och-backar/tandadalen/SimpleView/" },
            { name: "Högfjället", lat: 61.166, lon: 13.111, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/salen/vinter-i-salen/vader-och-backar/hogfjallet/SimpleView/" }
        ]
    },
    { 
        name: "Åre", country: "Sverige",
        subAreas: [
            { name: "Åre by", lat: 63.399, lon: 13.081, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/are/vinter-i-are/vader-och-backar/are-by/SimpleView/" },
            { name: "Högzon", lat: 63.428, lon: 13.090, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/are/vinter-i-are/vader-och-backar/hogzon/SimpleView/" },
            { name: "Åre Björnen", lat: 63.385, lon: 13.149, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/are/vinter-i-are/vader-och-backar/bjornen/SimpleView/" },
            { name: "Duved/Tegefjäll", lat: 63.397, lon: 12.934, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/are/vinter-i-are/vader-och-backar/duved-tegefjall/SimpleView/" }
        ]
    },
    { 
        name: "Trysil", country: "Norge",
        subAreas: [
            { name: "Turistsentret", lat: 61.302, lon: 12.242, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/trysil/vinter-i-trysil/vader-och-backar/turistsentret/SimpleView/" },
            { name: "Skihytta", lat: 61.294, lon: 12.213, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/trysil/vinter-i-trysil/vader-och-backar/skihytta/SimpleView/" },
            { name: "Høyfjellssentret", lat: 61.336, lon: 12.155, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/trysil/vinter-i-trysil/vader-och-backar/hoyfjellssentret/SimpleView/" },
            { name: "Høgegga", lat: 61.319, lon: 12.179, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/trysil/vinter-i-trysil/vader-och-backar/hogegga/SimpleView/" }
        ]
    },
    { 
        name: "Vemdalen", country: "Sverige",
        subAreas: [
            { name: "Vemdalsskalet", lat: 62.478, lon: 13.961, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/vemdalen/vinter-i-vemdalen/vader-och-backar/vemdalsskalet/SimpleView/" },
            { name: "Björnrike", lat: 62.395, lon: 13.963, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/vemdalen/vinter-i-vemdalen/vader-och-backar/bjornrike/SimpleView/" },
            { name: "Klövsjö/Storhogna", lat: 62.529, lon: 14.186, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/vemdalen/vinter-i-vemdalen/vader-och-backar/klovsjo/SimpleView/" }        
        ]
    },
    { name: "Hemsedal", country: "Norge", lat: 60.860, lon: 8.504, skistarUrl: "https://www.skistar.com/sv/vara-skidorter/hemsedal/vinter-i-hemsedal/vader-och-backar/SimpleView/" },
    { name: "Hammarbybacken", country: "Sverige", lat: 59.299, lon: 18.093 },
    
    // --- Övriga stora svenska skidorter (Sorterade ungefär från söder till norr) ---
    { name: "Isaberg", country: "Sverige", lat: 57.437, lon: 13.621 },
    { name: "Romme Alpin", country: "Sverige", lat: 60.397, lon: 15.385 },
    { name: "Säfsen", country: "Sverige", lat: 60.133, lon: 14.437 },
    { name: "Kungsberget", country: "Sverige", lat: 60.771, lon: 16.481 },
    { name: "Branäs", country: "Sverige", lat: 60.655, lon: 12.846 },
    { name: "Kläppen", country: "Sverige", lat: 61.033, lon: 13.344 },
    { name: "Orsa Grönklitt", country: "Sverige", lat: 61.211, lon: 14.536 },
    { name: "Stöten", country: "Sverige", lat: 61.265, lon: 12.883 },
    { name: "Järvsöbacken", country: "Sverige", lat: 61.705, lon: 16.166 },
    { name: "Idre Fjäll", country: "Sverige", lat: 61.889, lon: 12.691 },
    { name: "Fjätervålen", country: "Sverige", lat: 61.944, lon: 12.923 },
    { name: "Lofsdalen", country: "Sverige", lat: 62.115, lon: 13.275 },
    { name: "Hassela Ski Resort", country: "Sverige", lat: 62.113, lon: 16.711 },
    { name: "Funäsdalen", country: "Sverige", lat: 62.546, lon: 11.977 },
    { name: "Tänndalen", country: "Sverige", lat: 62.548, lon: 12.012 },
    { name: "Ramundberget", country: "Sverige", lat: 62.709, lon: 12.391 },
    { name: "Bydalsfjällen", country: "Sverige", lat: 63.208, lon: 13.784 },
    { name: "Kittelfjäll", country: "Sverige", lat: 65.263, lon: 15.526 },
    { name: "Hemavan", country: "Sverige", lat: 65.815, lon: 15.088 },
    { name: "Tärnaby", country: "Sverige", lat: 65.713, lon: 15.260 },
    { name: "Dundret (Gällivare)", country: "Sverige", lat: 67.112, lon: 20.598 },
    { name: "Björkliden", country: "Sverige", lat: 68.406, lon: 18.681 },
    { name: "Riksgränsen", country: "Sverige", lat: 68.428, lon: 18.125 }
];


// ==========================================
// --- SÖK OCH DROPDOWN FÖR SKIDORTER ---
// ==========================================

// Ritar ut sökresultaten i rullgardinsmenyn
function renderList(items) {
    resortList.innerHTML = "";
    items.forEach(resort => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${resort.name}</span> <span class="country-tag">${resort.country}</span>`;
        
        // Markera den ort som för tillfället är vald
        if (selectedResort && resort.name === selectedResort.name) {
            li.classList.add('is-selected');
        }

        // Hantera vad som händer när man klickar på en ort i listan
        li.onclick = () => {
            searchInput.value = resort.name;
            selectedResort = resort;
            resortList.classList.add('hidden');
            
            // Om orten har underområden (ex. Sälen -> Lindvallen), visa flikarna
            const subAreaContainer = document.getElementById('subAreaContainer');
            if (resort.subAreas && resort.subAreas.length > 0) {
                selectedSubAreaIndex = 0; 
                subAreaContainer.classList.remove('hidden');
                renderSubAreaTabs(resort.subAreas);
                
                // Klicka automatiskt på sök-knappen för att ladda första fliken
                setTimeout(() => document.getElementById('searchBtn').click(), 50);
            } else {
                subAreaContainer.classList.add('hidden');
            }
        };
        resortList.appendChild(li);
    });

    if (items.length > 0) resortList.classList.remove('hidden');
    else resortList.classList.add('hidden');
}

// Lyssnar på inmatning i sökfältet och filtrerar listan
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    resortList.classList.remove('hidden'); 
    
    const filteredResorts = vipResorts.filter(resort => {
        return resort.name.toLowerCase().includes(query) || 
               resort.country.toLowerCase().includes(query);
    });

    renderList(filteredResorts);
});

// Visa hela listan automatiskt när sökfältet får fokus
searchInput.addEventListener('focus', () => {
    searchInput.select();
    renderList(vipResorts);
});

// Stänger söklistan om man klickar någonstans utanför den
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown')) {
        if (resortList) resortList.classList.add('hidden');
    }
});


// ==========================================
// --- HJÄLPFUNKTIONER FÖR VÄDER ---
// ==========================================

// Översätter WMO-väderkoder från Open-Meteo till passande emojis
function getWeatherEmoji(code) {
    if (code === 0) return "☀️"; 
    if (code === 1 || code === 2) return "⛅"; 
    if (code === 3) return "☁️"; 
    if (code >= 45 && code <= 48) return "🌫️"; 
    if (code >= 51 && code <= 67) return "🌧️"; 
    if (code >= 71 && code <= 77) return "❄️"; 
    if (code >= 80 && code <= 82) return "🌦️"; 
    if (code >= 85 && code <= 86) return "🌨️"; 
    if (code >= 95) return "⛈️"; 
    return "🌡️";
}

// Översätter WMO-väderkoder till svensk beskrivande text
function getWeatherDesc(code) {
    if (code === 0) return "Klart"; 
    if (code === 1 || code === 2) return "Halvklart"; 
    if (code === 3) return "Mulet"; 
    if (code >= 45 && code <= 48) return "Dimma"; 
    if (code >= 51 && code <= 67) return "Regn"; 
    if (code >= 71 && code <= 77) return "Snöfall"; 
    if (code >= 80 && code <= 82) return "Regnskurar"; 
    if (code >= 85 && code <= 86) return "Snöbyar"; 
    if (code >= 95) return "Åska"; 
    return "Växlande";
}


// ==========================================
// --- API/BACKEND: SKRAPA DATA FÖR LIFTAR ---
// ==========================================

async function fetchSkistarLifts(targetUrl) {
    const cacheKey = `lifts_data_${targetUrl}`;
    const liftContainer = document.getElementById('liftContainer');
    const liftsOnlyList = document.getElementById('liftsOnlyList');
    const slopesOnlyList = document.getElementById('slopesOnlyList');
    
    // Nollställ gränssnittet innan ny data läses in
    liftContainer.classList.remove('hidden');
    liftsOnlyList.innerHTML = "";
    slopesOnlyList.innerHTML = "";
    updateText('liftStats', "Hämtar data...");

    // Skapar anropet till din backend (som gör det riktiga skrapandet)
    const localServerUrl = `${SERVER_BASE_URL}/scrape?url=${encodeURIComponent(targetUrl)}`;
    
    try {
        const response = await fetch(localServerUrl, {
            headers: { 'x-api-key': 'DittHemligaLösenord123' }
        });
        const htmlData = await response.text(); 
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');

        const groups = doc.querySelectorAll('.lpv-list__group');
        const liftsData = [];
        const slopesData = [];

        // Loopa igenom varje kategori av lift/backe som hittades
        groups.forEach(group => {
            const titleEl = group.querySelector('.lpv-list__group-toggle-text');
            if (!titleEl) return;

            let rawTitle = titleEl.textContent.trim();
            let categoryName = rawTitle.split('(')[0].trim();

            // Avgör om kategorin tillhör "Backar" eller "Liftar"
            const hasSlopeIcon = group.querySelector('.ssg-lpv__slope-icon') !== null;
            const isSlopeDeviation = categoryName.toLowerCase().includes('pister') || categoryName.toLowerCase().includes('backar');
            const type = (hasSlopeIcon || isSlopeDeviation) ? 'slope' : 'lift';

            const items = group.querySelectorAll('.lpv-list__item');
            const categoryItems = [];

            // Extrahera data för varje enskild lift/backe i kategorin
            items.forEach(item => {
                const nameElement = item.querySelector('.lpv-list__item-name');
                const statusElement = item.querySelector('.lpv-list__item-status');

                if (nameElement && statusElement) {
                    const name = nameElement.textContent.trim();
                    const statusText = statusElement.textContent.trim().replace(/\s+/g, ' ');
                    const isOpen = statusElement.classList.contains('lpv-list__item-status--is-open');
                    categoryItems.push({ name, status: statusText, isOpen });
                }
            });

            if (categoryItems.length > 0) {
                // Sammanslagning: Kombinerar listor med samma namn (t.ex. om Trysil har flera "Stolliftar")
                if (type === 'lift') {
                    const existing = liftsData.find(g => g.categoryName === categoryName);
                    if (existing) {
                        categoryItems.forEach(newItem => {
                            if (!existing.items.some(i => i.name === newItem.name)) existing.items.push(newItem);
                        });
                    } else {
                        liftsData.push({ categoryName, items: categoryItems });
                    }
                } else {
                    const existing = slopesData.find(g => g.categoryName === categoryName);
                    if (existing) {
                        categoryItems.forEach(newItem => {
                            if (!existing.items.some(i => i.name === newItem.name)) existing.items.push(newItem);
                        });
                    } else {
                        slopesData.push({ categoryName, items: categoryItems });
                    }
                }
            }
        });

        // Avbryt om ingen data hittades
        if (liftsData.length === 0 && slopesData.length === 0) {
            updateText('liftStats', "Ingen data kunde tolkas.");
            saveToCache(cacheKey, {
                liftsHtml: liftsOnlyList.innerHTML,
                slopesHtml: slopesOnlyList.innerHTML,
                stats: document.getElementById('liftStats').innerText,
                liftCount: document.getElementById('liftCount').innerText,
                slopeCount: document.getElementById('slopeCount').innerText
            });
            return;
        }

        // Hjälpfunktion: Sätter rätt ikon baserat på namnet på lift/pist
        function getDifficultyIcon(categoryName) {
            const name = (categoryName || "").toLowerCase();
            let iconHtml = '';
            
            if (name.includes("avvikelse")) {
                iconHtml = '<img src="pics/varning.png" alt="Varning" class="lift-icon-img">';
            }
            // Pister
            else if (name.includes("mycket lätt")) iconHtml = '<span class="difficulty-icon icon-very-easy"></span>';
            else if (name.includes("lätt")) iconHtml = '<span class="difficulty-icon icon-easy"></span>';
            else if (name.includes("medelsvår")) iconHtml = '<span class="difficulty-icon icon-intermediate"></span>';
            else if (name.includes("svår")) iconHtml = '<span class="difficulty-icon icon-difficult"></span>';
            // Parker/Övrigt
            else if (name.includes("övrig") || name.includes("park") || name.includes("arena")) {
                iconHtml = '<img src="pics/skidor.png" alt="Park" class="park-icon-img">';
            }
            // Liftar
            else if (name.includes("gondol") || name.includes("kabin") || name.includes("telemix")) {
                iconHtml = '<img src="pics/lyft.png" alt="Gondol" class="lift-icon-img">';
            }
            else if (name.includes("stol")) {
                iconHtml = '<img src="pics/sittlyft.png" alt="Stollift" class="lift-icon-img">';
            }
            else if (name.includes("bygel") || name.includes("ankar")) {
                iconHtml = '<img src="pics/ankarlyft.png" alt="Bygellift" class="lift-icon-img">';
            }
            else if (name.includes("knapp")) {
                iconHtml = '<img src="pics/knapplyft.png" alt="Knapplift" class="lift-icon-img">';
            }
            else if (name.includes("rullband")) {
                iconHtml = '<img src="pics/rullband.png" alt="Rullband" class="lift-icon-img">';
            }
            else {
                iconHtml = '<img src="pics/sittlyft.png" alt="Lift" class="lift-icon-img">'; // Fallback
            }
            return `<span class="icon-slot">${iconHtml}</span>`;
        }
        
        // Ritar ut kategorierna (dragspelsmenyerna) i gränssnittet
        function renderCategories(container, dataArray, countId) {
            let totalOpen = 0;
            let totalItems = 0;
            
            dataArray.forEach(group => {
                const groupOpen = group.items.filter(i => i.isOpen).length;
                const groupTotal = group.items.length;

                // Räkna inte med avvikelser i den generella "öppet"-statistiken
                if (!group.categoryName.toLowerCase().includes("avvikelse")) {
                    totalOpen += groupOpen;
                    totalItems += groupTotal;
                }

                const details = document.createElement('details');
                details.className = 'sub-accordion';                
                
                const summary = document.createElement('summary');
                const categoryIcon = getDifficultyIcon(group.categoryName);
                summary.innerHTML = `${categoryIcon} <span>${group.categoryName}</span> <span class="sub-count">${groupOpen}/${groupTotal} öppna</span>`;
                details.appendChild(summary);

                const ul = document.createElement('ul');
                ul.className = 'lift-list';
                
                // Rita ut varje enskild lift/backe i kategorin
                group.items.forEach(item => {
                    const li = document.createElement('li');
                    const statusClass = item.isOpen ? 'status-open' : 'status-closed';
                    
                    li.classList.add('clickable-row');
                    li.addEventListener('click', () => {
                        openFullscreenMap(item.name, targetUrl, allScrapedItems); 
                    });

                    li.innerHTML = `
                        <div style="display: flex; align-items: center;">
                            ${categoryIcon}
                            <span>${item.name}</span>
                        </div>
                        <span class="${statusClass}">${item.status}</span>
                    `;
                    ul.appendChild(li);
                });

                details.appendChild(ul);
                container.appendChild(details);
            });

            updateText(countId, `${totalOpen}/${totalItems}`);
            return { totalOpen, totalItems };
        }

        // Slå ihop alla hämtade objekt till en platt lista (används för kartfunktionen)
        const allScrapedItems = [];
        liftsData.forEach(g => allScrapedItems.push(...g.items));
        slopesData.forEach(g => allScrapedItems.push(...g.items));

        // Starta renderingen
        const liftTotals = renderCategories(liftsOnlyList, liftsData, 'liftCount');
        const slopeTotals = renderCategories(slopesOnlyList, slopesData, 'slopeCount');

        const allOpen = liftTotals.totalOpen + slopeTotals.totalOpen;
        const allItems = liftTotals.totalItems + slopeTotals.totalItems;
        updateText('liftStats', `${allOpen} av ${allItems} öppna totalt`);

    } catch (error) {
        console.error(error);
        updateText('liftStats', "Kunde inte nå din lokala server.");
    }
}


// ==========================================
// --- API/BACKEND: SKRAPA ORTENS HUVUDSIDA ---
// ==========================================

async function fetchSkistarMainPage(simpleViewUrl) {
    const cacheKey = `main_page_${simpleViewUrl}`;
    const mainUrl = simpleViewUrl.replace("SimpleView/", "");
    const localServerUrl = `${SERVER_BASE_URL}/scrape?url=${encodeURIComponent(mainUrl)}`;
    
    try {
        const response = await fetch(localServerUrl, {
            headers: { 'x-api-key': 'DittHemligaLösenord123' }
        });
        const htmlData = await response.text();
        
        // Städa HTML-koden för att enklare kunna söka efter texten med Regex
        const cleanText = htmlData.replace(/<[^>]+>/g, ' ')
                                  .replace(/&deg;/ig, '°')
                                  .replace(/&nbsp;/ig, ' ')
                                  .replace(/\s+/g, ' ');

        // Extrahera snödjup i terräng och pist
        const terrangMatch = cleanText.match(/Terräng\s*(\d+)\s*cm/i);
        const snowStr = terrangMatch ? `${terrangMatch[1]} <span class="unit">cm</span>` : "...";
        
        const pistMatch = cleanText.match(/Pist\s*(\d+)\s*cm/i);
        const pisteStr = pistMatch ? `${pistMatch[1]} <span class="unit">cm</span>` : "...";

        // Extrahera öppettider
        const oppettiderMatch = cleanText.match(/(\d{2}:\d{2}\s*[-–]\s*\d{2}:\d{2})/);
        const hoursStr = oppettiderMatch ? oppettiderMatch[1].replace(/\s+/g, '') : "-";

        // Extrahera temperaturer
        const temps = [...cleanText.matchAll(/(-?\d+(?:[.,]\d+)?)\s*°/g)];
        let tTop = "-", tValley = "-";
        if (temps.length >= 2) {
            tTop = temps[0][1].replace('.', ',') + "°";
            tValley = temps[1][1].replace('.', ',') + "°";
        }

        // Extrahera vindstyrkor
        const allWindsMatches = [...cleanText.matchAll(/(vindbyar|byar)?\s*(\d+)\s*m\s*\/\s*s/ig)];
        const averageWinds = allWindsMatches.filter(m => !m[1]).map(m => m[2]);
        let wTop = "", wValley = "";
        if (averageWinds.length >= 2) {
            wTop = averageWinds[0] + " m/s";
            wValley = averageWinds[1] + " m/s";
        }


        

        // --- NY LOGIK FÖR ATT STAPLA KLOCKSLAG ---
        let formattedTime = hoursStr;
        if (hoursStr !== "-") {
            // Vi splittar vid strecket (hanterar både vanligt - och långt – streck)
            const timeParts = hoursStr.split(/[-–]/); 
            if (timeParts.length === 2) {
                formattedTime = `<span>${timeParts[0]}</span><span class="time-sep">-</span><span>${timeParts[1]}</span>`;
            }
        }

        // Uppdatera UI - kom ihåg "true" på slutet för att tillåta <span>
        updateText('snowDepth', snowStr, true);
        updateText('pisteDepth', pisteStr, true);
        updateText('openHours', formattedTime, true); // <-- Ändrad här
        updateText('topTemp', tTop);
        updateText('valleyTemp', tValley);
        updateText('topWind', wTop);
        updateText('valleyWind', wValley);

        // Spara skrapad data till cachen ifall servern skulle ligga nere nästa gång
        saveToCache(cacheKey, {
            snow: snowStr,
            piste: pisteStr,
            hours: hoursStr,
            topTemp: tTop,
            valleyTemp: tValley,
            topWind: wTop,
            valleyWind: wValley
        });

    } catch (error) {
        console.error("Serverfel, hämtar från cache:", error);
        
        const cached = getFromCache(cacheKey);
        if (cached) {
            // Här hämtar vi exakt de variabler vi sparade i saveToCache ovan
            const c = cached.content; 
            
            updateText('snowDepth', c.snow + " (Cache)", true);
            updateText('pisteDepth', c.piste, true);
            updateText('openHours', c.hours, true);
            updateText('topTemp', c.topTemp);
            updateText('valleyTemp', c.valleyTemp);
            updateText('topWind', c.topWind);
            updateText('valleyWind', c.valleyWind);
            
            console.log("Visar sparad snödata från:", cached.timestamp);
        } else {
            updateText('snowDepth', "Offline");
        }
    }
}


// ==========================================
// --- HUVUDSÖKNING OCH TRIGGER ---
// ==========================================

document.getElementById('searchBtn').addEventListener('click', async () => {
    if (!selectedResort) { alert("Välj en skidort."); return; }

    // Initiera variabler för orten
    let currentLat = selectedResort.lat;
    let currentLon = selectedResort.lon;
    let currentName = selectedResort.name;
    let currentSkistarUrl = selectedResort.skistarUrl;

    // Byter variabler ifall orten har specifika underområden (T.ex. Lindvallen)
    if (selectedResort.subAreas && selectedResort.subAreas.length > 0) {
        if (selectedSubAreaIndex === -1) { alert("Välj ett område först."); return; }
        const selectedSubArea = selectedResort.subAreas[selectedSubAreaIndex];
        currentLat = selectedSubArea.lat;
        currentLon = selectedSubArea.lon;
        currentName = selectedResort.name + " (" + selectedSubArea.name + ")";
        currentSkistarUrl = selectedSubArea.skistarUrl;
    }

    // Visa resultat-ytan
    document.getElementById('result').classList.remove('hidden');
    
    // Dölj informationsboxen på startsidan
    const introBox = document.querySelector('.intro-info-box');
    if (introBox) introBox.style.display = 'none';
    

    updateText('cityName', currentName);
    updateText('openHours', "-");
    updateText('topTemp', "-");
    updateText('topWind', "");
    document.getElementById('liftContainer').classList.add('hidden');

    // Hämta väderdata från Open-Meteo
    const cacheKey = `weather_${currentName}`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&current=snow_depth,temperature_2m,wind_speed_10m,weather_code&timezone=auto`;

    try {
        const res = await fetch(weatherUrl);
        const data = await res.json();
        
        saveToCache(cacheKey, data);
        renderWeatherData(data);
        
        // Kör scraping-funktionerna endast om orten har en Skistar-länk
        if (currentSkistarUrl) {
            fetchSkistarLifts(currentSkistarUrl); 
            fetchSkistarMainPage(currentSkistarUrl); 
        }
    } catch (e) {
        console.log("Nätverksfel, hämtar från cache...");
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
            renderWeatherData(cachedData.content, true, cachedData.timestamp);
        } else {
            alert("Kunde inte hämta data och inget finns sparat.");
        }
    }
});


// ==========================================
// --- INTERAKTIV FULLSKÄRMSKARTA ---
// ==========================================

let currentZoom = 300; 
let minZoom = 100;
const mapScrollContainer = document.getElementById('mapScrollContainer');
const mapZoomWrapper = document.getElementById('mapZoomWrapper');
const mapImg = document.getElementById('modalMapImage');
mapImg.draggable = false; // Hindrar webbläsaren från att låta användaren "dra och släppa" bilden

// Tonar bort radar-markören mjukt när användaren rör på kartan
function fadeOutMarker() {
    const marker = document.querySelector('.highlight-marker');
    if (marker) {
        marker.style.transition = "opacity 0.3s ease";
        marker.style.opacity = '0';
        setTimeout(() => marker.remove(), 300);
    }
}

// Öppnar kartan över valt område och centrerar/radar-markerar den valda liften/backen
function openFullscreenMap(itemName, targetUrl, scrapedItems) {
    let currentMapData = null;
    let currentImageSrc = "";

    // Matcha URL:en mot rätt lokala karta
    if (targetUrl.includes("hundfjallet")) {
        currentMapData = hundfjalletMap;
        currentImageSrc = "pics/orter/salen_hundfjallet.webp"; 
    } 
    else if (targetUrl.includes("hogfjallet")) {
        currentMapData = typeof hogfjalletMap !== 'undefined' ? hogfjalletMap : [];
        currentImageSrc = "pics/orter/salen_hogfjallet.webp";
    } 
    else if (targetUrl.includes("lindvallen")) {
        currentMapData = typeof lindvallenMap !== 'undefined' ? lindvallenMap : [];
        currentImageSrc = "pics/orter/salen_lindvallen.webp";
    } 
    else if (targetUrl.includes("tandadalen")) {
        currentMapData = typeof tandadalenMap !== 'undefined' ? tandadalenMap : [];
        currentImageSrc = "pics/orter/salen_tandadalen.webp";
    }

    if (!currentImageSrc) return; // Avbryter tyst om ingen bild finns

    // Försök hitta den specifika liften/backens koordinater
    const mappedItem = currentMapData.find(m => {
        const cleanMapName = m.name.toLowerCase().replace(/[-\s]/g, '');
        const cleanSkistarName = itemName.toLowerCase().replace(/[-\s]/g, '');
        return cleanMapName === cleanSkistarName;
    });

    const modal = document.getElementById('mapModal');
    const container = document.getElementById('modalCrossesContainer');
    const allCrossesContainer = document.getElementById('modalAllCrossesContainer');
    const title = document.getElementById('modalLiftName');

    title.innerText = itemName;
    container.innerHTML = "";
    allCrossesContainer.innerHTML = "";

    // Placerar ut röda kryss på ALLA avstängda liftar/pister (om koordinater finns)
    if (scrapedItems && scrapedItems.length > 0) {
        scrapedItems.forEach(item => {
            if (!item.isOpen) {
                const mapPos = currentMapData.find(m => {
                    const cleanMapName = m.name.toLowerCase().replace(/[-\s]/g, '');
                    const cleanSkistarName = item.name.toLowerCase().replace(/[-\s]/g, '');
                    return cleanMapName === cleanSkistarName;
                });

                if (mapPos) {
                    const cross = document.createElement('div');
                    cross.className = 'closed-cross';
                    cross.innerText = '❌';
                    cross.style.left = mapPos.left + '%';
                    cross.style.top = mapPos.top + '%';
                    allCrossesContainer.appendChild(cross);
                }
            }
        });
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Låser fönstrets scroll bakom modalen

    // När bilden är färdigladdad räknar vi ut proportioner och zoom
    mapImg.onload = () => {
        const cWidth = mapScrollContainer.clientWidth;
        const cHeight = mapScrollContainer.clientHeight;
        const aspect = mapImg.naturalWidth / mapImg.naturalHeight;
        const heightAt100Percent = cWidth / aspect;
        minZoom = Math.max(100, Math.ceil((cHeight / heightAt100Percent) * 100));

        if (mappedItem) {
            // Om koordinater finns: Zooma in, sätt en radarmarkör och centrera kameran
            currentZoom = Math.max(300, minZoom); 
            mapZoomWrapper.style.width = currentZoom + '%';

            const marker = document.createElement('div');
            marker.className = 'highlight-marker';
            marker.style.left = mappedItem.left + '%';
            marker.style.top = mappedItem.top + '%';
            container.appendChild(marker);

            const mapWidth = cWidth * (currentZoom / 100);
            const mapHeight = heightAt100Percent * (currentZoom / 100);
            const targetX = (mappedItem.left / 100) * mapWidth;
            const targetY = (mappedItem.top / 100) * mapHeight;

            mapScrollContainer.scrollLeft = targetX - (cWidth / 2);
            mapScrollContainer.scrollTop = targetY - (cHeight / 2);
        } else {
            // Inga koordinater: Zooma ut kartan helt så man ser allt (ingen radar)
            currentZoom = minZoom;
            mapZoomWrapper.style.width = currentZoom + '%';
            mapScrollContainer.scrollLeft = 0;
            mapScrollContainer.scrollTop = 0;
        }
    };

    mapImg.src = currentImageSrc;
}


// ==========================================
// --- KARTA: ZOOM OCH PANORERING ---
// ==========================================

// Zooma genom att scrolla på mushjulet (Zoomar in mot muspekaren)
mapScrollContainer.addEventListener('wheel', (e) => {
    e.preventDefault(); 
    fadeOutMarker();
    
    // Var på skärmen är musen?
    const rect = mapScrollContainer.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Procentuell plats av kartan som ligger under musen
    const percentX = (mapScrollContainer.scrollLeft + cursorX) / mapZoomWrapper.clientWidth;
    const percentY = (mapScrollContainer.scrollTop + cursorY) / mapZoomWrapper.clientHeight;

    const zoomStep = 40; 
    if (e.deltaY < 0) {
        currentZoom = Math.min(currentZoom + zoomStep, 800); // Max inzoomning
    } else {
        currentZoom = Math.max(currentZoom - zoomStep, minZoom); // Lås vid min-nivå
    }

    mapZoomWrapper.style.width = currentZoom + '%';

    // Rätta till scroll-positionen så musen är över samma pixel på bilden
    mapScrollContainer.scrollLeft = (percentX * mapZoomWrapper.clientWidth) - cursorX;
    mapScrollContainer.scrollTop = (percentY * mapZoomWrapper.clientHeight) - cursorY;

}, { passive: false });

// Zoom-knapparna (+ och - i UI)
document.getElementById('zoomInBtn').addEventListener('click', () => {
    fadeOutMarker(); 
    currentZoom = Math.min(currentZoom + 100, 800);
    mapZoomWrapper.style.width = currentZoom + '%';
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
    fadeOutMarker(); 
    currentZoom = Math.max(currentZoom - 100, minZoom);
    mapZoomWrapper.style.width = currentZoom + '%';
});

// Variabler för panoreringslogiken ("dra-för-att-röra-kartan")
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;

// Datormus: Nedtryckt
mapScrollContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    mapScrollContainer.style.cursor = 'grabbing'; 
    startX = e.pageX - mapScrollContainer.offsetLeft;
    startY = e.pageY - mapScrollContainer.offsetTop;
    scrollLeft = mapScrollContainer.scrollLeft;
    scrollTop = mapScrollContainer.scrollTop;
});

// Datormus: Släppt (lyssnar globalt ifall man släpper utanför fönstret)
window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        mapScrollContainer.style.cursor = 'grab'; 
    }
});

// Datormus: Drar musen
mapScrollContainer.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault(); 
    fadeOutMarker();
    const walkX = (e.pageX - mapScrollContainer.offsetLeft - startX); 
    const walkY = (e.pageY - mapScrollContainer.offsetTop - startY);
    mapScrollContainer.scrollLeft = scrollLeft - walkX;
    mapScrollContainer.scrollTop = scrollTop - walkY;
});

// Mobiltelefon (Touch): Sätter ner fingret
mapScrollContainer.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].pageX - mapScrollContainer.offsetLeft;
    startY = e.touches[0].pageY - mapScrollContainer.offsetTop;
    scrollLeft = mapScrollContainer.scrollLeft;
    scrollTop = mapScrollContainer.scrollTop;
});

// Mobiltelefon (Touch): Lyfter fingret
window.addEventListener('touchend', () => {
    isDragging = false;
});

// Mobiltelefon (Touch): Drar fingret
mapScrollContainer.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    fadeOutMarker();
    const walkX = (e.touches[0].pageX - mapScrollContainer.offsetLeft - startX); 
    const walkY = (e.touches[0].pageY - mapScrollContainer.offsetTop - startY);
    mapScrollContainer.scrollLeft = scrollLeft - walkX;
    mapScrollContainer.scrollTop = scrollTop - walkY;
});


// ==========================================
// --- STÄNG-LOGIK OCH UTVECKLARVERKTYG ---
// ==========================================

// Stänger kartmodulen
function closeModal() {
    document.getElementById('mapModal').classList.add('hidden');
    document.body.style.overflow = ''; // Återställer sidans scroll
}
document.querySelector('.close-modal').addEventListener('click', closeModal);
document.getElementById('mapModal').addEventListener('click', (e) => {
    if (e.target.id === 'mapModal') closeModal(); // Stänger om man klickar på bakgrunden
});


// ==========================================
// --- ANIMERADE DRAGSPELSMENYER ---
// ==========================================

// Lyssnar globalt för att animera alla `<details>`-taggar och stänga andra
document.addEventListener('click', (e) => {
    const summary = e.target.closest('summary');
    if (!summary) return;

    const details = summary.parentElement;
    if (details.tagName !== 'DETAILS') return;

    e.preventDefault(); // Stoppa omedelbar klippning

    // Stäng alla andra menyer (syskon) på samma nivå
    const parent = details.parentElement;
    const siblings = parent.querySelectorAll(':scope > details');
    siblings.forEach(other => {
        if (other !== details && other.open) {
            closeAccordion(other);
        }
    });

    // Öppna eller stäng den valda
    if (details.open) {
        closeAccordion(details);
    } else {
        openAccordion(details);
    }
});

// Stänger dragspelsmenyn mjukt via CSS transitions
function closeAccordion(detailsEl) {
    const content = detailsEl.querySelector('summary').nextElementSibling;
    if (!content) return (detailsEl.open = false);

    // Mät exakt var vi startar (inklusive padding)
    const exactHeight = content.getBoundingClientRect().height;

    content.style.height = exactHeight + 'px';
    content.style.overflow = 'hidden';
    content.offsetHeight; // Reflow

    content.style.transition = 'all 0.3s ease-in-out';
    content.style.height = '0px';
    content.style.opacity = '0';
    content.style.paddingTop = '0px';
    content.style.paddingBottom = '0px';

    content.addEventListener('transitionend', function handler(e) {
        if (e.propertyName !== 'height') return;
        detailsEl.open = false; 
        
        // Rensa upp tillagda inline-styles
        content.style.transition = '';
        content.style.height = '';
        content.style.opacity = '';
        content.style.paddingTop = '';
        content.style.paddingBottom = '';
        content.style.overflow = '';
        content.removeEventListener('transitionend', handler);
    });
}

// Öppnar dragspelsmenyn mjukt via CSS transitions
function openAccordion(detailsEl) {
    const content = detailsEl.querySelector('summary').nextElementSibling;
    if (!content) return (detailsEl.open = true);

    detailsEl.open = true; 

    // Mäter renderingen innan visning för att förhindra "hackiga" animationer
    const exactHeight = content.getBoundingClientRect().height;

    const style = window.getComputedStyle(content);
    const pt = style.paddingTop;
    const pb = style.paddingBottom;

    content.style.height = '0px';
    content.style.opacity = '0';
    content.style.paddingTop = '0px';
    content.style.paddingBottom = '0px';
    content.style.overflow = 'hidden';
    content.offsetHeight; // Reflow

    content.style.transition = 'all 0.3s ease-in-out';
    content.style.height = exactHeight + 'px';
    content.style.opacity = '1';
    content.style.paddingTop = pt;
    content.style.paddingBottom = pb;

    content.addEventListener('transitionend', function handler(e) {
        if (e.propertyName !== 'height') return;
        
        // Rensa upp tillagda inline-styles
        content.style.transition = '';
        content.style.height = '';
        content.style.opacity = '';
        content.style.paddingTop = '';
        content.style.paddingBottom = '';
        content.style.overflow = '';
        content.removeEventListener('transitionend', handler);
    });
}


// ==========================================
// --- ÖVRIGA FUNKTIONER ---
// ==========================================

// Kaffe-knappen för dricks via Ko-fi
const coffeeBtn = document.getElementById('coffeeBtn');

if (coffeeBtn) {
    coffeeBtn.addEventListener('click', () => {
        window.open('https://ko-fi.com/jonathanwenell', '_blank');
    });
}