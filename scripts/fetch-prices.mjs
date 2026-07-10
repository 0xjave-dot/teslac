// Use global fetch (Node 18+)
async function fetchTSLA() {
  const res = await fetch('https://api.nasdaq.com/api/quote/TSLA/info?assetclass=stocks', { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json, text/plain, */*' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const data = json?.data?.primaryData
  if (!data || typeof data.lastSalePrice !== 'string') throw new Error('TSLA data missing')
  const rawPrice = data.lastSalePrice.replace(/[^0-9.-]+/g, '')
  const price = parseFloat(rawPrice)
  const change = typeof data.percentageChange === 'string' ? parseFloat(data.percentageChange.replace('%', '')) : 0
  if (!Number.isFinite(price)) throw new Error('TSLA price parse failed')
  return { price, changePct: Number.isFinite(change) ? change : 0 }
}

async function fetchCryptos() {
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', { headers: { 'User-Agent': 'Mozilla/5.0' } })
  const json = await res.json()
  return {
    BTC: { price: json.bitcoin.usd, changePct: json.bitcoin.usd_24h_change },
    ETH: { price: json.ethereum.usd, changePct: json.ethereum.usd_24h_change },
    SOL: { price: json.solana.usd, changePct: json.solana.usd_24h_change },
  }
}

async function main() {
  try {
    const tsla = await fetchTSLA()
    const cryptos = await fetchCryptos()
    console.log('Current prices (source: NASDAQ/Coingecko):')
    console.log(`TSLA: $${tsla.price.toFixed(2)} (${tsla.changePct.toFixed(2)}%)`)
    console.log(`BTC:  $${cryptos.BTC.price} (${cryptos.BTC.changePct?.toFixed(2) ?? '0'}%)`)
    console.log(`ETH:  $${cryptos.ETH.price} (${cryptos.ETH.changePct?.toFixed(2) ?? '0'}%)`)
    console.log(`SOL:  $${cryptos.SOL.price} (${cryptos.SOL.changePct?.toFixed(2) ?? '0'}%)`)
  } catch (e) {
    console.error('Failed to fetch prices:', e)
    process.exit(1)
  }
}

main()
