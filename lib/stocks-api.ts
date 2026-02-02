import { StockQuote } from '@/types'

// Yahoo Finance API using yahoo-finance2 package
// This runs on the server side

interface YahooQuote {
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
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    // Using yahoo-finance2 package
    const yahooFinance = (await import('yahoo-finance2')).default
    const quote = await yahooFinance.quote(symbol) as YahooQuote

    if (!quote) return null

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

  // Fetch quotes in parallel with a limit
  const batchSize = 5
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(getStockQuote))

    results.forEach((quote, index) => {
      if (quote) {
        quotes.set(batch[index], quote)
      }
    })
  }

  return quotes
}

export async function searchStocks(query: string): Promise<{ symbol: string; name: string }[]> {
  try {
    const yahooFinance = (await import('yahoo-finance2')).default
    const results = await yahooFinance.search(query)

    return results.quotes
      .filter((q: { quoteType?: string }) => q.quoteType === 'EQUITY')
      .slice(0, 10)
      .map((q: { symbol: string; shortname?: string; longname?: string }) => ({
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
      name: symbol, // Alpha Vantage doesn't return company name in this endpoint
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
