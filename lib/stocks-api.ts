import { StockQuote } from '@/types'

// Finnhub API - Free tier with 60 calls/minute
// Get your free API key at https://finnhub.io/

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || ''

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  // Try Finnhub first (more reliable from serverless)
  if (FINNHUB_API_KEY) {
    const quote = await getStockQuoteFinnhub(symbol)
    if (quote) return quote
  }

  // Fallback to Yahoo Finance
  return getStockQuoteYahoo(symbol)
}

async function getStockQuoteFinnhub(symbol: string): Promise<StockQuote | null> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status}`)
      return null
    }

    const data = await response.json()

    // Finnhub returns c=0 for invalid symbols
    if (!data.c || data.c === 0) {
      return null
    }

    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      price: data.c, // Current price
      change: data.d, // Change
      changePercent: data.dp, // Change percent
      previousClose: data.pc,
      open: data.o,
      dayHigh: data.h,
      dayLow: data.l,
      volume: 0, // Not included in basic quote
    }
  } catch (error) {
    console.error(`Error fetching Finnhub quote for ${symbol}:`, error)
    return null
  }
}

async function getStockQuoteYahoo(symbol: string): Promise<StockQuote | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`)
      return null
    }

    const data = await response.json()

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
    console.error(`Error fetching Yahoo quote for ${symbol}:`, error)
    return null
  }
}

export async function getMultipleQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const quotes = new Map<string, StockQuote>()

  if (symbols.length === 0) return quotes

  // Fetch quotes one by one (Finnhub doesn't support batch in free tier)
  for (const symbol of symbols) {
    const quote = await getStockQuote(symbol)
    if (quote) {
      quotes.set(symbol, quote)
    }
  }

  return quotes
}

export async function searchStocks(query: string): Promise<{ symbol: string; name: string }[]> {
  // Try Finnhub search first
  if (FINNHUB_API_KEY) {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`,
        { cache: 'no-store' }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.result && data.result.length > 0) {
          return data.result
            .filter((r: any) => r.type === 'Common Stock')
            .slice(0, 10)
            .map((r: any) => ({
              symbol: r.symbol,
              name: r.description || r.symbol,
            }))
        }
      }
    } catch (error) {
      console.error('Finnhub search error:', error)
    }
  }

  // Fallback to Yahoo search
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    return (data.quotes || [])
      .filter((q: any) => q.quoteType === 'EQUITY')
      .slice(0, 10)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
      }))
  } catch (error) {
    console.error('Error searching stocks:', error)
    return []
  }
}
