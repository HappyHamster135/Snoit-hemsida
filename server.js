const express = require('express');
const cors = require('cors');
const fs = require('fs').promises; // <-- NYTT: Tillåter servern att läsa/skriva filer
const path = require('path');      // <-- NYTT: Hjälper till att skapa filsökvägar
const app = express();

app.use(cors());


app.get('/', (req, res) => {
    res.status(200).send('Snöit API är vaken och körs! ❄️');
});


app.get('/scrape', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const targetUrl = req.query.url; 

    if (apiKey !== 'DittHemligaLösenord123') {
        return res.status(403).send("Obehörig åtkomst!");
    }

    if (!targetUrl) {
        return res.status(400).send("Ingen URL angiven.");
    }

    // Skapa ett filnamn för säkerhetskopian baserat på orten (t.ex. "cache_hundfjallet.html")
    const safeUrlName = targetUrl.replace(/[^a-zA-Z0-9]/g, '_');
    const cacheFilePath = path.join(__dirname, `${safeUrlName}.html`);

    try {
        console.log("Försöker skrapa live-data från:", targetUrl); 
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error(`Skistar svarade med status: ${response.status}`);

        const html = await response.text();
        
        // GICK DET BRA? 
        // 1. Skicka live-datan till hemsidan
        res.send(html);

        // 2. Spara datan tyst i bakgrunden till en fil för framtida krascher!
        await fs.writeFile(cacheFilePath, html, 'utf-8');
        console.log(`Säkerhetskopia sparad för: ${targetUrl}`);

    } catch (error) {
        console.error("Kunde inte nå Skistar:", error.message);
        console.log("Försöker hämta från säkerhetskopian (filen) istället...");

        try {
            // GICK DET DÅLIGT?
            // Läs från filen vi sparade förra gången det funkade!
            const cachedHtml = await fs.readFile(cacheFilePath, 'utf-8');
            console.log("Säkerhetskopia hittad och skickad till användaren!");
            res.send(cachedHtml);
        } catch (fileError) {
            // Om det kraschar OCH vi aldrig hunnit spara någon fil (t.ex. första gången man kör)
            console.error("Ingen säkerhetskopia fanns.");
            res.status(500).send("Serverfel och ingen sparad data fanns.");
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servern körs och lyssnar på port ${PORT}`);
});