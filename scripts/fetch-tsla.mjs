async function fetchTSLA() {
  const url = 'https://api.nasdaq.com/api/quote/TSLA/info?assetclass=stocks'
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json, text/plain, */*' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const data = json?.data?.primaryData
  if (!data || typeof data.lastSalePrice !== 'string') throw new Error('No TSLA data')
  const rawPrice = data.lastSalePrice.replace(/[^0-9.-]+/g, '')
  const change = typeof data.percentageChange === 'string' ? parseFloat(data.percentageChange.replace('%', '')) : 0
  return { price: parseFloat(rawPrice), changePct: Number.isFinite(change) ? change : 0 }
}

async function main() {
  try {
    const tsla = await fetchTSLA()
    console.log('Current TSLA price (NASDAQ public API):')
    console.log(`TSLA: $${tsla.price.toFixed(2)} (${tsla.changePct.toFixed(2)}%)`)
  } catch (e) {
    console.error('Failed to fetch TSLA:', e)
    process.exit(1)
  }
}

main()
