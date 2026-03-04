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
const areByMap = [
    { name: "skistar-snow-park-svart-linje", left: 22.21, top: 50.78 },
    { name: "skistar-snow-park-röd-linje", left: 22.52, top: 53.42 },
    { name: "skistar-snow-park-blå-linje", left: 25.97, top: 50.23 },
    { name: "skistar-snow-park-blå-linje", left: 29.13, top: 52.09 },
    { name: "störtloppet-långzon", left: 41.27, top: 59.47 },
    { name: "slalombacken", left: 64.34, top: 63.89 },
    { name: "hummelbranten", left: 67.09, top: 46.73 },
    { name: "rödingen", left: 14.47, top: 35.26 },
    { name: "rödbäcken", left: 16.17, top: 35.67 },
    { name: "rödbranten", left: 16.78, top: 40.86 },
    { name: "lundsrappet", left: 38.70, top: 64.61 },
    { name: "gästrappet", left: 42.41, top: 71.39 },
    { name: "vmsstörtloppet", left: 46.82, top: 69.82 },
    { name: "worldcupbacken", left: 68.37, top: 63.13 },
    { name: "månbranten", left: 70.41, top: 64.77 },
    { name: "stjärnbacken", left: 72.69, top: 62.07 },
    { name: "snobbrännan", left: 75.23, top: 56.37 },
    { name: "pelikansvängen", left: 67.36, top: 44.05 },
    { name: "tottbacken", left: 81.04, top: 68.00 },
    { name: "bibbos-brant", left: 83.82, top: 49.82 },
    { name: "fjällblicken", left: 95.36, top: 50.23 },
    { name: "ullåhöa", left: 12.29, top: 29.85 },
    { name: "ullådraget", left: 6.88, top: 36.06 },
    { name: "långsvängen-långzon", left: 14.89, top: 31.00 },
    { name: "ripleden", left: 16.39, top: 32.97 },
    { name: "röde-orm", left: 9.53, top: 43.05 },
    { name: "liten-röd", left: 14.72, top: 44.39 },
    { name: "rödkulleleden", left: 20.26, top: 45.77 },
    { name: "worldcupleden", left: 54.42, top: 47.33 },
    { name: "åreleden-långzon", left: 35.56, top: 43.14 },
    { name: "bräckeleden", left: 52.04, top: 52.82 },
    { name: "tvättbrädan", left: 73.15, top: 48.85 },
    { name: "vm-leden", left: 59.50, top: 45.24 },
    { name: "tottbryggan", left: 79.39, top: 63.20 },
    { name: "ullåmon", left: 15.20, top: 27.62 },
    { name: "ripan", left: 12.11, top: 45.04 },
    { name: "valles-äventyrsbana", left: 10.82, top: 44.70 },
    { name: "rödhaken", left: 11.69, top: 54.60 },
    { name: "rullband-rödkullen", left: 10.73, top: 57.31 },
    { name: "bergbanan", left: 69.11, top: 83.22 },
    { name: "rödhakeliften", left: 12.93, top: 57.39 },
    { name: "ripanliften-1", left: 12.93, top: 50.11 },
    { name: "ripanliften-2", left: 12.93, top: 50.11 },
    { name: "ullådalsliften-1", left: 2.24, top: 36.77 },
    { name: "ullådalsliften-2", left: 2.24, top: 36.77 },
    { name: "rödkulleliften-1", left: 14.00, top: 52.90 },
    { name: "rödkulleliften-2", left: 14.00, top: 52.90 },
    { name: "bräckeliften", left: 28.24, top: 62.14 },
    { name: "tottliften", left: 77.02, top: 70.12 },
    { name: "vm8:an", left: 45.03, top: 82.68 },
    { name: "stjärnliften", left: 64.45, top: 78.22 },
    { name: "vm6:an", left: 65.88, top: 78.30 },
    { name: "hummelliften", left: 76.21, top: 53.44 },
    { name: "fjällgårdsexpressen", left: 78.55, top: 59.44 }
];
const areHogzonMap = [
    { name: "störtloppet-högzon", left: 44.91, top: 23.59 },
    { name: "röda-rappet", left: 44.57, top: 20.38 },
    { name: "tusenmetersbacken", left: 53.30, top: 19.15 },
    { name: "fjällbacken", left: 56.66, top: 21.65 },
    { name: "tvärävalvsbacken", left: 35.81, top: 19.26 },
    { name: "stendalsbacken", left: 29.28, top: 27.66 },
    { name: "långsvängen-högzon", left: 26.30, top: 30.38 },
    { name: "åreleden-högzon", left: 39.40, top: 25.51 },
    { name: "svartbergsleden", left: 59.01, top: 40.75 },
    { name: "tväråleden", left: 30.49, top: 24.80 },
    { name: "solravinen", left: 27.92, top: 26.17 },
    { name: "renleden", left: 21.76, top: 29.58 },
    { name: "stendalsleden", left: 25.67, top: 24.52 },
    { name: "stendalsliften", left: 24.48, top: 28.18 },
    { name: "nedre-tväråvalvsliften-1", left: 29.62, top: 23.36 },
    { name: "nedre-tväråvalvsliften-2", left: 29.62, top: 23.36 },
    { name: "övre-tväråvalvsliften", left: 42.63, top: 16.58 },
    { name: "gondolen", left: 41.20, top: 42.52 },
    { name: "kabinbanan", left: 62.87, top: 78.07 }
];
const areBjornenMap = [
    { name: "viksvängen", left: 24.90, top: 43.86 },
    { name: "högåsbacken", left: 25.93, top: 56.31 },
    { name: "björnenleden", left: 8.17, top: 16.82 },
    { name: "fröåsvängen", left: 18.92, top: 24.29 },
    { name: "sadelbacken", left: 26.35, top: 39.74 },
    { name: "sadelleden", left: 22.27, top: 35.52 },
    { name: "björnbacken", left: 62.52, top: 43.19 },
    { name: "järvbacken", left: 82.29, top: 21.86 },
    { name: "järvsvängen", left: 83.97, top: 27.14 },
    { name: "björnladent", left: 84.07, top: 22.49 },
    { name: "getvalsbacken", left: 23.63, top: 25.67 },
    { name: "hermelinbacken", left: 52.22, top: 41.53 },
    { name: "vargenbacken", left: 58.43, top: 37.62 },
    { name: "lokattsbacken", left: 66.88, top: 42.55 },
    { name: "mårdbacken", left: 71.33, top: 47.43 },
    { name: "nallebacken", left: 71.79, top: 36.51 },
    { name: "örnleden", left: 92.53, top: 26.30 },
    { name: "örnbacken", left: 96.97, top: 23.96 },
    { name: "vesslan-rullband-björnen", left: 68.52, top: 49.32 },
    { name: "lokattliften", left: 65.29, top: 49.00 },
    { name: "vargenliften", left: 64.93, top: 40.22 },
    { name: "mårdenliften", left: 75.43, top: 51.30 },
    { name: "nalleliften", left: 68.91, top: 39.26 },
    { name: "copperhill-liften", left: 94.49, top: 25.51 },
    { name: "högåsliften", left: 33.10, top: 73.74 },
    { name: "hermelinenliften", left: 34.36, top: 61.95 },
    { name: "björnenliften", left: 61.98, top: 69.06 },
    { name: "järvenliften", left: 70.41, top: 41.21 },
    { name: "vikliften", left: 29.80, top: 49.90 },
    { name: "getvalsliften", left: 36.52, top: 32.28 },
    { name: "sadelexpressen", left: 35.10, top: 72.50 }
];
const areDuvedMap = [
    { name: "skistar-snow-park", left: 23.61, top: 45.18 },
    { name: "träningsbacken-puckeln", left: 27.76, top: 53.29 },
    { name: "hamrebacken", left: 26.76, top: 24.05 },
    { name: "mullfjällsbacken", left: 32.50, top: 25.32 },
    { name: "träningsbacken", left: 31.04, top: 38.15 },
    { name: "leråbacken", left: 36.75, top: 51.03 },
    { name: "tegebacken", left: 73.35, top: 43.03 },
    { name: "tegesvängen", left: 78.13, top: 40.95 },
    { name: "englandsbacken", left: 52.55, top: 53.73 },
    { name: "gunnilbacken", left: 72.63, top: 49.45 },
    { name: "vildmarksstigen", left: 73.38, top: 26.78 },
    { name: "tegeleden", left: 72.35, top: 55.94 },
    { name: "fjällbacken", left: 78.48, top: 28.54 },
    { name: "bergesvängen", left: 84.02, top: 23.35 },
    { name: "lillåleden", left: 88.94, top: 23.88 },
    { name: "byspåret", left: 4.33, top: 78.87 },
    { name: "torpbacken", left: 20.88, top: 71.39 },
    { name: "dalbacken", left: 22.57, top: 72.34 },
    { name: "minitege", left: 86.56, top: 80.34 },
    { name: "dr1-rullband-duved", left: 20.23, top: 74.05 },
    { name: "dr2-rullband-tegefjäll", left: 84.72, top: 83.03 },
    { name: "byliften", left: 2.90, top: 88.97 },
    { name: "torpliften", left: 23.54, top: 74.68 },
    { name: "mini-tege", left: 87.36, top: 83.91 },
    { name: "hamreliften", left: 6.10, top: 77.86 },
    { name: "leråliften", left: 25.77, top: 75.18 },
    { name: "englasliften", left: 62.24, top: 72.35 },
    { name: "gunnilliften", left: 64.58, top: 74.06 },
    { name: "fjällvallsliften", left: 95.16, top: 34.95 },
    { name: "duveds-linbana", left: 13.07, top: 75.76 },
    { name: "tegeliften", left: 85.30, top: 72.37 }
];




// ==========================================
// --- KART-REGISTER (DICTIONARY) ---
// ==========================================
// Här kopplar vi ihop en del av URL:en (t.ex. "are-by") med rätt data och bild.
const mapRegistry = {
    "hundfjallet": { data: typeof hundfjalletMap !== 'undefined' ? hundfjalletMap : [], image: "pics/orter/salen_hundfjallet.webp" },
    "hogfjallet": { data: typeof hogfjalletMap !== 'undefined' ? hogfjalletMap : [], image: "pics/orter/salen_hogfjallet.webp" },
    "lindvallen": { data: typeof lindvallenMap !== 'undefined' ? lindvallenMap : [], image: "pics/orter/salen_lindvallen.webp" },
    "tandadalen": { data: typeof tandadalenMap !== 'undefined' ? tandadalenMap : [], image: "pics/orter/salen_tandadalen.webp" },
    
    // -- ÅRE --
    "are-by": { data: typeof areByMap !== 'undefined' ? areByMap : [], image: "pics/orter/are_by.webp" },
    "hogzon": { data: typeof areHogzonMap !== 'undefined' ? areHogzonMap : [], image: "pics/orter/are_hogzon.webp" },
    "bjornen": { data: typeof areBjornenMap !== 'undefined' ? areBjornenMap : [], image: "pics/orter/are_bjornen.webp" },
    "duved-tegefjall": { data: typeof areDuvedMap !== 'undefined' ? areDuvedMap : [], image: "pics/orter/are_duved-tegefjall.webp" }
};


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
            const isTrain = categoryName.toLowerCase().includes('bergbana');
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

        // ==========================================
        // --- IKON- OCH HJÄLPFUNKTIONER ---
        // ==========================================
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
            else if (name.includes("gondol") || name.includes("telemix")) {
                iconHtml = '<img src="pics/gondol.png" alt="Gondol" class="lift-icon-img">';
            }
            else if (name.includes("kabin")) {
                iconHtml = '<img src="pics/kabin.png" alt="Kabin" class="lift-icon-img">';
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
            else if (name.includes("bergbana")) {
                iconHtml = '<img src="pics/bergbanor.png" alt="Bergbana" class="lift-icon-img">';
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
                    
                    // 1. Fråga registret: Har vi en karta för den här orten (targetUrl)?
                    const hasMap = Object.keys(mapRegistry).some(key => targetUrl.includes(key));

                    // Rita ut varje enskild lift/backe i kategorin
                    group.items.forEach(item => {
                        const li = document.createElement('li');
                        const statusClass = item.isOpen ? 'status-open' : 'status-closed';
                        
                        // 2. Lägg BARA till klick-funktionen om hasMap är true
                        if (hasMap) {
                            li.classList.add('clickable-row');
                            li.addEventListener('click', () => {
                                openFullscreenMap(item.name, targetUrl, allScrapedItems); 
                            });
                        } else {
                            // Annars, låt muspekaren vara en vanlig pil (inte en klick-hand)
                            li.style.cursor = 'default';
                        }

                        li.innerHTML = `
                            <div style="display: flex; align-items: center;">
                                ${categoryIcon}
                                <span>${item.name}</span>
                            </div>
                            <span class="${statusClass}">${item.status}</span>
                        `;
                        ul.appendChild(li);
                    });
                });

                details.appendChild(ul);
                container.appendChild(details);
            });

            updateText(countId, `${totalOpen}/${totalItems}`);
            return { totalOpen, totalItems };
        }

        // Slå ihop alla hämtade objekt till en platt lista och SPARA KATEGORIN (Viktigt för kart-menyn!)
            const allScrapedItems = [];

            liftsData.forEach(group => {
                group.items.forEach(item => {
                    // Lägger till 'category' och 'type' på varje lift
                    allScrapedItems.push({ ...item, category: group.categoryName, type: 'lift' });
                });
            });

            slopesData.forEach(group => {
                group.items.forEach(item => {
                    // Lägger till 'category' och 'type' på varje pist
                    allScrapedItems.push({ ...item, category: group.categoryName, type: 'slope' });
                });
            });
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
    
    // 1. VISA CACHE DIREKT (Snabb-respons)
    const quickCache = getFromCache(cacheKey);
    if (quickCache) {
        console.log("Visar snabb-cache medan servern vaknar...");
        renderDataToUI(quickCache.content); 
    }

    const mainUrl = simpleViewUrl.replace("SimpleView/", "");
    const localServerUrl = `${SERVER_BASE_URL}/scrape?url=${encodeURIComponent(mainUrl)}`;
    
    // 2. TIMEOUT-LOGIK (Vänta max 2 sekunder på Render)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); 

    try {
        const response = await fetch(localServerUrl, {
            headers: { 'x-api-key': 'DittHemligaLösenord123' },
            signal: controller.signal // Kopplar timeouten hit
        });
        clearTimeout(timeoutId); // Avbryt timeout om vi fick svar i tid
        
        const htmlData = await response.text();
        
        // Städa HTML-koden
        const cleanText = htmlData.replace(/<[^>]+>/g, ' ')
                                  .replace(/&deg;/ig, '°')
                                  .replace(/&nbsp;/ig, ' ')
                                  .replace(/\s+/g, ' ');

        // Extrahera data med Regex
        const terrangMatch = cleanText.match(/Terräng\s*(\d+)\s*cm/i);
        const snowStr = terrangMatch ? `${terrangMatch[1]} <span class="unit">cm</span>` : "...";
        
        const pistMatch = cleanText.match(/Pist\s*(\d+)\s*cm/i);
        const pisteStr = pistMatch ? `${pistMatch[1]} <span class="unit">cm</span>` : "...";

        const oppettiderMatch = cleanText.match(/(\d{2}:\d{2}\s*[-–]\s*\d{2}:\d{2})/);
        const hoursStr = oppettiderMatch ? oppettiderMatch[1].replace(/\s+/g, '') : "-";

        const temps = [...cleanText.matchAll(/(-?\d+(?:[.,]\d+)?)\s*°/g)];
        let tTop = "-", tValley = "-";
        if (temps.length >= 2) {
            tTop = temps[0][1].replace('.', ',') + "°";
            tValley = temps[1][1].replace('.', ',') + "°";
        }

        const allWindsMatches = [...cleanText.matchAll(/(vindbyar|byar)?\s*(\d+)\s*m\s*\/\s*s/ig)];
        const averageWinds = allWindsMatches.filter(m => !m[1]).map(m => m[2]);
        let wTop = "", wValley = "";
        if (averageWinds.length >= 2) {
            wTop = averageWinds[0] + " m/s";
            wValley = averageWinds[1] + " m/s";
        }

        // Formatera klockslag för stapling
        let formattedTime = hoursStr;
        if (hoursStr !== "-") {
            const timeParts = hoursStr.split(/[-–]/); 
            if (timeParts.length === 2) {
                formattedTime = `<span>${timeParts[0]}</span><span class="time-sep">-</span><span>${timeParts[1]}</span>`;
            }
        }

        // 3. SKAPA OBJEKT FÖR UI OCH CACHE
        const freshData = {
            snow: snowStr,
            piste: pisteStr,
            hours: formattedTime, // Sparar den formaterade HTML:en
            rawHours: hoursStr,   // Sparar rådata för säkerhet
            topTemp: tTop,
            valleyTemp: tValley,
            topWind: wTop,
            valleyWind: wValley
        };

        // Uppdatera UI med färsk data
        renderDataToUI(freshData);

        // Spara till cachen
        saveToCache(cacheKey, freshData);

    } catch (error) {
        console.log("Servern sover eller nätverksfel. Cachen används.");
        // Om vi inte har någon cache alls (första gången man besöker sidan)
        if (!quickCache) {
            updateText('snowDepth', "Offline");
        }
    }
}

// HJÄLPFUNKTION: Uppdaterar alla fält i gränssnittet
function renderDataToUI(c) {
    updateText('snowDepth', c.snow, true);
    updateText('pisteDepth', c.piste, true);
    updateText('openHours', c.hours, true);
    updateText('topTemp', c.topTemp);
    updateText('valleyTemp', c.valleyTemp);
    updateText('topWind', c.topWind);
    updateText('valleyWind', c.valleyWind);
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

let currentMapItems = [];
let currentMapType = 'lift';
let currentTargetUrl = "";

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

// Skapar listan över liftar/pister inuti kartan
function renderMapSideMenu(type) {
    const listContainer = document.getElementById('mapMenuList');
    if (!listContainer) return;
    listContainer.innerHTML = "";
    currentMapType = type;

    // Gruppera föremålen baserat på kategorin, och räkna totalen!
    const grouped = {};
    let tabTotalItems = 0;
    let tabOpenItems = 0;

    currentMapItems.forEach(item => {
        if (item.type !== type) return;
        
        const cat = item.category || "Övrigt";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);

        // Räkna hur många som är öppna av alla i denna flik (Liftar eller Pister)
        tabTotalItems++;
        if (item.isOpen) tabOpenItems++;
    });

    // Inbyggd ikon-byggare
    function getMenuIcon(catName) {
        const n = catName.toLowerCase();
        let innerContent = ''; 

        if (n.includes("mycket lätt")) innerContent = '<span class="difficulty-icon icon-very-easy"></span>';
        else if (n.includes("lätt")) innerContent = '<span class="difficulty-icon icon-easy"></span>';
        else if (n.includes("medelsvår")) innerContent = '<span class="difficulty-icon icon-intermediate"></span>';
        else if (n.includes("svår")) innerContent = '<span class="difficulty-icon icon-difficult"></span>';
        else {
            let img = 'sittlyft.png'; 
            if (n.includes("avvikelse")) img = 'varning.png';
            else if (n.includes("övrig") || n.includes("park") || n.includes("arena")) img = 'skidor.png';
            else if (n.includes("gondol") || n.includes("telemix")) img = 'gondol.png';
            else if (n.includes("kabin")) img = 'kabin.png';
            else if (n.includes("stol")) img = 'sittlyft.png';
            else if (n.includes("bygel") || n.includes("ankar")) img = 'ankarlyft.png';
            else if (n.includes("knapp")) img = 'knapplyft.png';
            else if (n.includes("rullband")) img = 'rullband.png';
            else if (n.includes("bergbana")) img = 'bergbanor.png';
            
            innerContent = `<img src="pics/${img}" style="max-width:18px; max-height:18px; object-fit:contain;">`;
        }
        return `<div class="icon-slot" style="width:24px; height:24px; display:flex; justify-content:center; align-items:center; flex-shrink:0;">${innerContent}</div>`;
    }

    // --- NYTT: Skapa rubriken högst upp som visar "X/Y öppna" ---
    const statsHeader = document.createElement('div');
    statsHeader.style.padding = "10px 15px";
    statsHeader.style.borderBottom = "1px solid #eee";
    statsHeader.style.fontWeight = "bold";
    statsHeader.style.color = "#48A6A7"; // Din teal-färg
    statsHeader.style.fontSize = "13px";
    statsHeader.style.textAlign = "center";
    statsHeader.style.backgroundColor = "#f8fafc";
    statsHeader.innerText = `${tabOpenItems}/${tabTotalItems} öppna`;
    listContainer.appendChild(statsHeader);
    // ------------------------------------------------------------

    // Skapa dragspelsmenyerna för varje kategori
    for (const category in grouped) {
        const categoryItems = grouped[category];
        
        // Räkna öppna per specifik kategori (t.ex. Stolliftar)
        const categoryTotal = categoryItems.length;
        const categoryOpen = categoryItems.filter(i => i.isOpen).length;

        const details = document.createElement('details');
        const iconHtml = getMenuIcon(category); 
        
        const summary = document.createElement('summary');
        // NYTT: Nu visar den (Öppna/Totala) istället för bara (Totala) bredvid pilen
        summary.innerHTML = `
            <div style="display: flex; align-items: center; flex-grow: 1;">
                ${iconHtml} 
                <span style="margin-left: 12px;">${category}</span> 
            </div>
            <span style="font-weight:normal; font-size:12px; color:#94a3b8;">(${categoryOpen}/${categoryTotal})</span>
        `;
        
        const ul = document.createElement('ul');
        categoryItems.forEach(item => {
            const li = document.createElement('li');
            const color = item.isOpen ? '#48A6A7' : '#e53e3e';
            
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            
            li.innerHTML = `
                <span>${item.name}</span>
                <div class="status-dot" style="background: ${color}; width: 8px; height: 8px; border-radius: 50%; margin-left: 10px; flex-shrink: 0;"></div>
            `;
            
            li.onclick = (e) => {
                e.stopPropagation();
                
                // Stäng menyn och ta fram zoom-knapparna igen
                const menu = document.getElementById('mapSideMenu');
                const toggleBtn = document.getElementById('toggleMapMenu');
                const zoomControls = document.getElementById('mapZoomControls');
                
                if (menu) menu.classList.add('hidden');
                if (toggleBtn) toggleBtn.classList.remove('open');
                if (zoomControls) {
                    zoomControls.style.opacity = '1';
                    zoomControls.style.pointerEvents = 'auto';
                }

                // Panorera till vald pist/lift
                openFullscreenMap(item.name, currentTargetUrl, currentMapItems);
            };
            ul.appendChild(li);
        });

        details.appendChild(summary);
        details.appendChild(ul);
        listContainer.appendChild(details);
    }
}



// Öppnar kartan över valt område och centrerar/radar-markerar den valda liften/backen
function openFullscreenMap(itemName, targetUrl, scrapedItems) {

    currentTargetUrl = targetUrl;
    currentMapItems = scrapedItems || [];

    let currentMapData = null;
    let currentImageSrc = "";


    // MAGIN: Vi loopar snabbt igenom registret. Om URL:en matchar en nyckel, hämta kartan!
    for (const key in mapRegistry) {
        if (targetUrl.includes(key)) {
            currentMapData = mapRegistry[key].data;
            currentImageSrc = mapRegistry[key].image;
            break; // Avbryt loopen när vi hittat rätt
        }
    }

    if (!currentImageSrc || !currentMapData) return;
    
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

            // --- NYTT: Mjuk och smooth panorering till målet ---
            mapScrollContainer.scrollTo({
                left: targetX - (cWidth / 2),
                top: targetY - (cHeight / 2),
                behavior: 'smooth'
            });
            // ----------------------------------------------------

        } else {
            // Inga koordinater: Zooma ut kartan helt så man ser allt (ingen radar)
            currentZoom = minZoom;
            mapZoomWrapper.style.width = currentZoom + '%';
            
            // --- NYTT: Mjuk panorering tillbaka till toppen ---
            mapScrollContainer.scrollTo({
                left: 0,
                top: 0,
                behavior: 'smooth'
            });
            // ----------------------------------------------------
        }
    };

    mapImg.src = currentImageSrc;

    renderMapSideMenu(currentMapType);

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


// Öppna/Stäng sidomenyn på kartan
const toggleMapBtn = document.getElementById('toggleMapMenu');
if (toggleMapBtn) {
    toggleMapBtn.onclick = () => {
        const menu = document.getElementById('mapSideMenu');
        const zoomControls = document.getElementById('mapZoomControls');
        
        // Öppna/stäng menyn
        menu.classList.toggle('hidden');
        toggleMapBtn.classList.toggle('open');
        
        // Göm eller visa zoom-knapparna beroende på om menyn är öppen
        if (!menu.classList.contains('hidden')) {
            // Menyn är öppen: Göm zoom-knapparna
            zoomControls.style.opacity = '0';
            zoomControls.style.pointerEvents = 'none'; // Gör dem oklickbara när de är osynliga
        } else {
            // Menyn är stängd: Visa zoom-knapparna igen
            zoomControls.style.opacity = '1';
            zoomControls.style.pointerEvents = 'auto';
        }
    };
}

// Växla mellan Liftar och Pister i menyn
const liftTab = document.getElementById('showLiftsTab');
const slopeTab = document.getElementById('showSlopesTab');

if (liftTab) {
    liftTab.onclick = (e) => {
        document.querySelectorAll('.map-menu-tabs button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderMapSideMenu('lift');
    };
}

if (slopeTab) {
    slopeTab.onclick = (e) => {
        document.querySelectorAll('.map-menu-tabs button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderMapSideMenu('slope');
    };
}


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


// ==========================================
// --- TOUCH-LOGIK: PANORERING OCH PINCH-ZOOM (MOBIL) ---
// ==========================================
let pinchStartDist = 0;
let pinchStartZoom = 0;
let pinchCenterX = 0;
let pinchCenterY = 0;
let pinchStartScrollLeft = 0;
let pinchStartScrollTop = 0;

mapScrollContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        // Ett finger: Starta vanlig panorering
        isDragging = true;
        startX = e.touches[0].pageX - mapScrollContainer.offsetLeft;
        startY = e.touches[0].pageY - mapScrollContainer.offsetTop;
        scrollLeft = mapScrollContainer.scrollLeft;
        scrollTop = mapScrollContainer.scrollTop;
    } else if (e.touches.length === 2) {
        // Två fingrar: Starta Pinch-zoom!
        isDragging = false; // Avbryt panorering
        
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        pinchStartDist = Math.hypot(dx, dy);
        pinchStartZoom = currentZoom;

        // Räkna ut exakt var mitten mellan dina två fingrar är på skärmen
        const screenCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const screenCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        const rect = mapScrollContainer.getBoundingClientRect();
        pinchCenterX = screenCenterX - rect.left;
        pinchCenterY = screenCenterY - rect.top;

        pinchStartScrollLeft = mapScrollContainer.scrollLeft;
        pinchStartScrollTop = mapScrollContainer.scrollTop;
    }
}, { passive: false });

mapScrollContainer.addEventListener('touchmove', (e) => {
    // Om kartan inte visas, strunta i touch-eventet
    if (document.getElementById('mapModal').classList.contains('hidden')) return;
    
    // Förhindra att webbläsaren drar ner sidan (pull-to-refresh)
    if (e.cancelable) e.preventDefault(); 
    fadeOutMarker();

    if (e.touches.length === 1 && isDragging) {
        // Ett finger: Dra kartan (scrolla)
        const walkX = (e.touches[0].pageX - mapScrollContainer.offsetLeft - startX); 
        const walkY = (e.touches[0].pageY - mapScrollContainer.offsetTop - startY);
        mapScrollContainer.scrollLeft = scrollLeft - walkX;
        mapScrollContainer.scrollTop = scrollTop - walkY;
        
    } else if (e.touches.length === 2) {
        // Två fingrar: Zooma in precis där fingrarna är
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        const dist = Math.hypot(dx, dy);

        // Räkna ut den nya zoomen
        const zoomFactor = dist / pinchStartDist;
        let newZoom = pinchStartZoom * zoomFactor;
        
        // Lås zoomen så du inte kan zooma hur långt in/ut som helst
        newZoom = Math.min(Math.max(newZoom, minZoom), 800);
        
        // Applicera zoomen på själva wrappern (vilket gör att kryssen följer med!)
        mapZoomWrapper.style.width = newZoom + '%';

        // Matematik för att flytta kameran så att punkten mellan fingrarna ligger stilla
        const scaleRatio = newZoom / pinchStartZoom;
        const pointX = pinchStartScrollLeft + pinchCenterX;
        const pointY = pinchStartScrollTop + pinchCenterY;
        const newPointX = pointX * scaleRatio;
        const newPointY = pointY * scaleRatio;

        mapScrollContainer.scrollLeft = newPointX - pinchCenterX;
        mapScrollContainer.scrollTop = newPointY - pinchCenterY;
        
        currentZoom = newZoom; // Spara den nya zoomnivån
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        pinchStartDist = 0; // Återställ pinch om man släpper ett finger
    }
    if (e.touches.length === 0) {
        isDragging = false; // Sluta dra om man släpper alla fingrar
    }
});