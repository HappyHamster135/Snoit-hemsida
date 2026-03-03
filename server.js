const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/scrape', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const targetUrl = req.query.url; 

    if (apiKey !== 'DittHemligaLösenord123') {
        return res.status(403).send("Obehörig åtkomst!");
    }

    if (!targetUrl) {
        return res.status(400).send("Ingen URL angiven.");
    }

    try {
        console.log("Försöker skrapa:", targetUrl); 
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error(`Skistar svarade med: ${response.status}`);

        const html = await response.text();
        res.send(html);

    } catch (error) {
        console.error("Scrape error:", error);
        res.status(500).send("Serverfel vid hämtning.");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servern körs och lyssnar på port ${PORT}`);
});;