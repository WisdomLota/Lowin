'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, IChartApi, AreaSeries } from 'lightweight-charts'

interface PricePoint {
  time: number
  value: number
}

interface PriceChartProps {
  data: PricePoint[]
  isLoading: boolean
}

// Smart price formatter for sub-penny coins
function formatChartPrice(price: number): string {
  if (price === 0) return '0'
  if (price < 0.00000001) return price.toExponential(2)
  if (price < 0.000001) return price.toFixed(10)
  if (price < 0.0001) return price.toFixed(8)
  if (price < 0.01) return price.toFixed(6)
  return price.toFixed(4)
}

export function PriceChart({ data, isLoading }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: '#27272a' },
        horzLines: { color: '#27272a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#27272a',
      },
      crosshair: {
        horzLine: { color: '#3f3f46' },
        vertLine: { color: '#3f3f46' },
      },
      localization: {
        priceFormatter: formatChartPrice,
      },
    })

    const firstPrice = data[0]?.value ?? 0
    const lastPrice = data[data.length - 1]?.value ?? 0
    const isPositive = lastPrice >= firstPrice
    const lineColor = isPositive ? '#34d399' : '#f87171'
    const areaTop = isPositive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)'
    const areaBottom = 'rgba(0, 0, 0, 0)'

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: areaTop,
      bottomColor: areaBottom,
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: formatChartPrice,
      },
    })

    series.setData(data as any)
    chart.timeScale().fitContent()
    chartRef.current = chart

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <div className="w-3 h-3 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
          Loading chart...
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-zinc-600 text-sm">
        No chart data available
      </div>
    )
  }

  return <div ref={chartContainerRef} />
}