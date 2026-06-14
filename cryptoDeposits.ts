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
    address: 'bc1qf9d3m5zphta7y8j6ks7v2y4cnp4e65qlx0t5yh',
    description: 'Send BTC only. Confirm all on-chain transfers to this address only. Allow 1-3 confirmations for crediting.',
    provider: 'Custody wallet partner',
  },
  {
    label: 'Ethereum',
    network: 'ETH (ERC-20)',
    address: '0xA1b2C3d4E5f678901234567890abcdefABCDEF12',
    description: 'Send ETH or ERC-20 assets on the Ethereum network only. Do not send assets on other chains to this address.',
    provider: 'Custody wallet partner',
  },
  {
    label: 'Tether',
    network: 'USDT (ERC-20)',
    address: '0xD4b2F3c4E5f67890aBC1234567890aBCdef12345',
    description: 'Send USDT using ERC-20. Other networks may not be supported and could result in loss of funds.',
    provider: 'Custody wallet partner',
  },
]





