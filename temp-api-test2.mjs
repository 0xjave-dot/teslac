const massiveKey = 'Y40XgWw5oD68QlYeOdNJupZL4WEF2QXs';
const freeKey = 'xa10oy338r11l08rw6sq';
const testUrls = [
  { name: 'massive-v1-quote', url: 'https://api.massive.com/v1/stocks/quote?symbol=TSLA', headers: { Authorization: `Bearer ${massiveKey}` } },
  { name: 'massive-v1-rest', url: 'https://api.massive.com/v1/rest/stocks/quote?symbol=TSLA', headers: { Authorization: `Bearer ${massiveKey}` } },
  { name: 'massive-api-rest', url: 'https://api.massive.com/api/rest/stocks/quote?symbol=TSLA', headers: { Authorization: `Bearer ${massiveKey}` } },
  { name: 'massive-api-quote', url: 'https://api.massive.com/api/stocks/quote?symbol=TSLA', headers: { Authorization: `Bearer ${massiveKey}` } },
  { name: 'massive-api-ticker', url: 'https://api.massive.com/api/ticker?symbol=TSLA', headers: { Authorization: `Bearer ${massiveKey}` } },
  { name: 'massive-root', url: 'https://api.massive.com', headers: {} },
  { name: 'api.massive-root', url: 'https://massive.com/api', headers: {} },
  { name: 'freecrypto-getData', url: 'https://api.freecryptoapi.com/v1/getData?symbol=BTC', headers: { Authorization: `Bearer ${freeKey}` } },
  { name: 'freecrypto-get-data', url: 'https://api.freecryptoapi.com/v1/get-data?symbol=BTC', headers: { Authorization: `Bearer ${freeKey}` } },
  { name: 'freecrypto-market-data', url: 'https://api.freecryptoapi.com/v1/market-data?symbol=BTC', headers: { Authorization: `Bearer ${freeKey}` } },
  { name: 'freecrypto-data-quotes', url: 'https://api.freecryptoapi.com/v1/data/quotes?symbol=BTC', headers: { Authorization: `Bearer ${freeKey}` } },
];

for (const { name, url, headers } of testUrls) {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    console.log(name, url, res.status, res.headers.get('content-type'));
    console.log(text.slice(0, 500));
  } catch (err) {
    console.error(name, url, err.message || err);
  }
}
