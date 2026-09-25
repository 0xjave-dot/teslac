const massiveKey = 'Y40XgWw5oD68QlYeOdNJupZL4WEF2QXs';
const freeKey = 'xa10oy338r11l08rw6sq';
const tests = [
  {
    name: 'Massive last quote header',
    url: 'https://api.massive.com/v2/last/nbbo/TSLA',
    headers: { Authorization: `Bearer ${massiveKey}` },
  },
  {
    name: 'Massive last quote query',
    url: `https://api.massive.com/v2/last/nbbo/TSLA?apiKey=${massiveKey}`,
    headers: {},
  },
  {
    name: 'Massive crypto snapshot header',
    url: 'https://api.massive.com/v2/snapshot/locale/global/markets/crypto/tickers/BTC',
    headers: { Authorization: `Bearer ${massiveKey}` },
  },
  {
    name: 'Massive crypto snapshot query',
    url: `https://api.massive.com/v2/snapshot/locale/global/markets/crypto/tickers/BTC?apiKey=${massiveKey}`,
    headers: {},
  },
  {
    name: 'FreeCrypto getData header BTC',
    url: 'https://api.freecryptoapi.com/v1/getData?symbol=BTC',
    headers: { Authorization: `Bearer ${freeKey}` },
  },
  {
    name: 'FreeCrypto getData query BTC',
    url: `https://api.freecryptoapi.com/v1/getData?symbol=BTC&apiKey=${freeKey}`,
    headers: {},
  },
  {
    name: 'FreeCrypto getData header ETH',
    url: 'https://api.freecryptoapi.com/v1/getData?symbol=ETH',
    headers: { Authorization: `Bearer ${freeKey}` },
  },
];

for (const test of tests) {
  try {
    const res = await fetch(test.url, { headers: test.headers });
    const body = await res.text();
    console.log('===', test.name, '===');
    console.log('status:', res.status);
    console.log('content-type:', res.headers.get('content-type'));
    console.log(body.slice(0, 1000));
  } catch (err) {
    console.error('ERROR', test.name, err.message || err);
  }
}
