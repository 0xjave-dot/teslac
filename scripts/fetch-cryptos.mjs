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
    const cryptos = await fetchCryptos()
    console.log('Current crypto prices (CoinGecko):')
    console.log(`BTC: $${cryptos.BTC.price} (${cryptos.BTC.changePct?.toFixed(2) ?? '0'}%)`)
    console.log(`ETH: $${cryptos.ETH.price} (${cryptos.ETH.changePct?.toFixed(2) ?? '0'}%)`)
    console.log(`SOL: $${cryptos.SOL.price} (${cryptos.SOL.changePct?.toFixed(2) ?? '0'}%)`)
  } catch (e) {
    console.error('Failed to fetch cryptos:', e)
    process.exit(1)
  }
}

main()
