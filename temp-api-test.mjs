const massiveKey = 'Y40XgWw5oD68QlYeOdNJupZL4WEF2QXs';
const freeKey = 'xa10oy338r11l08rw6sq';
const massiveUrls = [
  'https://api.massive.com/stocks/quote?symbol=TSLA',
  'https://api.massive.com/rest/stocks/quote?symbol=TSLA',
  'https://massive.com/api/rest/stocks/quote?symbol=TSLA',
  'https://massive.com/api/stocks/quote?symbol=TSLA',
];
const freeUrls = [
  'https://api.freecryptoapi.com/v1/getData?symbol=BTC',
  'https://api.freecryptoapi.com/v1/get-data?symbol=BTC',
  'https://api.freecryptoapi.com/v1/market-data?symbol=BTC',
  'https://api.freecryptoapi.com/v1/data/quotes?symbol=BTC',
];

for (const url of massiveUrls) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${massiveKey}`, Accept: 'application/json' } });
    const text = await res.text();
    console.log('M', url, res.status, text.slice(0, 500));
  } catch (err) {
    console.error('MERR', url, err.message || err);
  }
}

for (const url of freeUrls) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${freeKey}` } });
    const text = await res.text();
    console.log('F', url, res.status, text.slice(0, 500));
  } catch (err) {
    console.error('FERR', url, err.message || err);
  }
}
