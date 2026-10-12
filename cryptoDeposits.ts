export interface CryptoDepositMethod {
  label: string
  network: string
  address: string
  memo?: string
  description: string
  provider: string
}

export const cryptoDepositMethods: CryptoDepositMethod[] = [
  {
    label: 'Bitcoin',
    network: 'BTC',
    address: 'bc1qz3hdsqfmlsfmuuqnwjl9k7kxpzm4w276vqskdu',
    description: 'Send BTC only. Confirm all on-chain transfers to this address only. Allow 1-3 confirmations for crediting.',
    provider: 'Custody wallet partner',
  },
  {
    label: 'Ethereum',
    network: 'ETH (ERC-20)',
    address: '0x81f28Aa6cF45F54aa28c534f21552230911fE093',
    description: 'Send ETH or ERC-20 assets on the Ethereum network only. Do not send assets on other chains to this address.',
    provider: 'Custody wallet partner',
  },
  {
    label: 'Tether',
    network: 'USDT (Solana)',
    address: '7i4bWqQWCm6FBdKusv8A7MWc388HAmW6SVv55UhnU1gd',
    description: 'Send USDT using Solana only. Other networks may not be supported and could result in loss of funds.',
    provider: 'Custody wallet partner',
  },
]





