import { StockQuote } from '@/types'

// Yahoo Finance API using direct fetch (no external package)
// This avoids build issues with yahoo-finance2

interface YahooQuoteResponse {
  quoteResponse: {
    result: {
      symbol: string
      shortName?: string
      longName?: string
      regularMarketPrice: number
      regularMarketChange: number
      regularMarketChangePercent: number
      regularMarketPreviousClose: number
      regularMarketOpen: number
      regularMarketDayHigh: number
      regularMarketDayLow: number
      regularMarketVolume: number
      marketCap?: number
    }[]
    error: null | string
  }
}

interface YahooSearchResponse {
  quotes: {
    symbol: string
    shortname?: string
    longname?: string
    quoteType?: string
  }[]
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    )

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`)
      return null
    }

    const data: YahooQuoteResponse = await response.json()

    if (!data.quoteResponse?.result?.[0]) {
      return null
    }

    const quote = data.quoteResponse.result[0]

    return {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      previousClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
    }
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error)
    return null
  }
}

export async function getMultipleQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const quotes = new Map<string, StockQuote>()

  if (symbols.length === 0) return quotes

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 60 },
      }
    )

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`)
      return quotes
    }

    const data: YahooQuoteResponse = await response.json()

    if (data.quoteResponse?.result) {
      for (const quote of data.quoteResponse.result) {
        quotes.set(quote.symbol, {
          symbol: quote.symbol,
          name: quote.shortName || quote.longName || quote.symbol,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          previousClose: quote.regularMarketPreviousClose,
          open: quote.regularMarketOpen,
          dayHigh: quote.regularMarketDayHigh,
          dayLow: quote.regularMarketDayLow,
          volume: quote.regularMarketVolume,
          marketCap: quote.marketCap,
        })
      }
    }
  } catch (error) {
    console.error('Error fetching multiple quotes:', error)
  }

  return quotes
}

export async function searchStocks(query: string): Promise<{ symbol: string; name: string }[]> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    )

    if (!response.ok) {
      console.error(`Yahoo Finance search error: ${response.status}`)
      return []
    }

    const data: YahooSearchResponse = await response.json()

    return (data.quotes || [])
      .filter((q) => q.quoteType === 'EQUITY')
      .slice(0, 10)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
      }))
  } catch (error) {
    console.error('Error searching stocks:', error)
    return []
  }
}

// Alternative: Alpha Vantage API (requires API key)
export async function getStockQuoteAlphaVantage(symbol: string): Promise<StockQuote | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    console.error('Alpha Vantage API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    )
    const data = await response.json()

    if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
      return null
    }

    const quote = data['Global Quote']

    return {
      symbol: quote['01. symbol'],
      name: symbol,
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      previousClose: parseFloat(quote['08. previous close']),
      open: parseFloat(quote['02. open']),
      dayHigh: parseFloat(quote['03. high']),
      dayLow: parseFloat(quote['04. low']),
      volume: parseInt(quote['06. volume']),
    }
  } catch (error) {
    console.error(`Error fetching quote from Alpha Vantage for ${symbol}:`, error)
    return null
  }
}
