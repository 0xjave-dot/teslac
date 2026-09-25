const key = 'Y40XgWw5oD68QlYeOdNJupZL4WEF2QXs';
const urls = [
  `https://api.massive.com/v2/snapshot/locale/global/markets/stocks/tickers/TSLA`,
  `https://api.massive.com/v2/snapshot/locale/global/markets/stocks/tickers/TSLA?apiKey=${key}`,
  `https://api.massive.com/v2/last/nbbo/TSLA`,
  `https://api.massive.com/v2/last/nbbo/TSLA?apiKey=${key}`,
];
for (const url of urls) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    const text = await res.text();
    console.log('URL', url, 'status', res.status, text.slice(0, 500));
  } catch (err) {
    console.error('ERR', url, err.message || err);
  }
}
