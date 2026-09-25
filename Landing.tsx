import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { useAssets } from './useAssets'
import { isTslaPriceFresh } from './priceUtils'
import { StockPriceChart } from './StockPriceChart'
import { PriceChange } from './PriceChange'

const steps = [
  {
    num: '01',
    icon: '💳',
    title: 'Fund your account',
    desc: 'Submit a deposit request. Our team reviews and approves it, typically within 24 hours.',
  },
  {
    num: '02',
    icon: '📈',
    title: 'Browse live assets',
    desc: 'Explore Tesla stock, Bitcoin, Ethereum and more — all at real-time market prices.',
  },
  {
    num: '03',
    icon: '⚡',
    title: 'Execute orders',
    desc: 'Buy and sell instantly. Track your portfolio performance and P&L in real time.',
  },
]

export function Landing() {
  const { priceMap, now } = useAssets()
  const tslaAsset = priceMap.TSLA
  const tslaLive = isTslaPriceFresh(tslaAsset, now)

  return (
    <div className="bg-[#F8F9FC] min-h-screen">
      {/* Navbar */}
      <nav className="bg-[#F8F9FC]/80 backdrop-blur border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-content mx-auto px-8 h-16 flex items-center justify-between">
          <Logo size="sm" textColor="text-gray-900" />
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="border border-gray-300 text-gray-700 rounded-full px-5 py-2 text-sm hover:bg-gray-100 transition"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-accent text-white rounded-full px-5 py-2 text-sm hover:bg-accent/90 transition"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-[92vh] grid md:grid-cols-2 items-center">
        <div className="flex flex-col justify-center pl-8 md:pl-24 pr-8 py-16">
          <span className="bg-accent/10 text-accent text-xs px-3 py-1 rounded-full inline-block mb-6 w-fit">
            Live Prices · Real Orders · Instant Execution
          </span>
          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-[1.05] tracking-tight text-gray-950">
            Invest in Tesla
            <br />
            <span className="text-accent">&amp; Top Assets</span>
          </h1>
          <p className="text-gray-500 text-lg mt-6 max-w-sm leading-relaxed">
            A live demo trading platform. Practice buying stocks and crypto with real market prices, no risk.
          </p>
          <div className="mt-10 flex gap-3">
            <Link
              to="/register"
              className="bg-accent text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-accent/90 transition"
            >
              Start Trading
            </Link>
            <Link
              to="/markets"
              className="border border-gray-300 text-gray-700 rounded-full px-6 py-3 text-sm hover:bg-gray-100 transition"
            >
              View Markets
            </Link>
          </div>
          <div className="mt-14 flex gap-10">
            {[
              { stat: '9 Assets', label: 'Available to trade' },
              { stat: 'Live Prices', label: 'Updated every 10s' },
              { stat: 'Instant', label: 'Order execution' },
            ].map((s) => (
              <div key={s.stat}>
                <p className="text-2xl font-medium text-gray-950">{s.stat}</p>
                <p className="text-sm text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right visual */}
        <div className="hidden md:flex items-center justify-center pr-16 py-16">
          <div className="bg-navy-base rounded-3xl shadow-2xl shadow-navy-base/50 p-6 w-80">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">TSLA · Market price</p>
            <p className="text-white text-2xl font-medium num">
              {tslaLive && tslaAsset ? `$${tslaAsset.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Unavailable'}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs ${tslaLive ? 'text-gain' : 'text-loss'}`}>
                {tslaLive ? 'Live quote · refreshes every 10s' : tslaAsset?.priceError || 'Live quote unavailable'}
              </p>
              {tslaLive && tslaAsset && <PriceChange value={tslaAsset.change24h} className="text-xs" />}
            </div>

            <div className="mt-4 -mx-2">
              <StockPriceChart symbol="TSLA" range="1D" asset={tslaAsset || null} now={now} height={80} showAxes={false} />
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium">
                    T
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">TSLA</p>
                    <p className="text-white/40 text-[10px]">Tesla Inc.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-xs num">
                    {tslaLive && tslaAsset ? `$${tslaAsset.currentPrice.toFixed(2)}` : 'Unavailable'}
                  </p>
                  {tslaLive && tslaAsset && <PriceChange value={tslaAsset.change24h} className="text-[10px]" />}
                </div>
              </div>
            </div>

            <button className="mt-4 w-full bg-buy text-navy-base rounded-lg py-2.5 text-sm font-medium hover:bg-buy/90 transition">
              Buy TSLA
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-t border-gray-100 py-24">
        <div className="max-w-content mx-auto px-8">
          <h2 className="text-3xl font-medium tracking-tight text-gray-950 text-center mb-16">How it works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-4">{step.num}</div>
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="text-lg font-medium text-gray-950 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F8F9FC] border-t border-gray-100 py-10">
        <div className="max-w-content mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" textColor="text-gray-900" />
            <span className="text-gray-400 text-xs">© 2025 Tesla Stock Investment. Demo platform only.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="text-gray-500 text-sm hover:text-gray-900 transition">Sign in</Link>
            <Link to="/register" className="text-gray-500 text-sm hover:text-gray-900 transition">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}





