import { useQuery } from '@tanstack/react-query'
import { Coin } from '@/types/coin'

interface CoinsResponse {
  coins: Coin[]
  updated_at: string
  count: number
}

export function useCoins() {
  return useQuery<CoinsResponse>({
    queryKey: ['coins'],
    queryFn: async () => {
      const res = await fetch('/api/coins')
      if (!res.ok) throw new Error('Failed to fetch coins')
      return res.json()
    },
  })
}