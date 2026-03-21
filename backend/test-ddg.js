const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://html.duckduckgo.com/html/?q=Pattachitra', {
    headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
}).then(res => {
    const $ = cheerio.load(res.data);
    $('.result').each((i, el) => {
        const titleAnchor = $(el).find('.result__title a');
        let url = titleAnchor.attr('href');
        console.log('HREF:', url);
        if (url && url.includes('uddg=')) url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
        console.log('Decoded:', url);
    });
});
