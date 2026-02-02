import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStockQuote } from "@/lib/stocks-api"

export async function POST() {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all stocks
    const { data: stocks, error: fetchError } = await supabase
      .from("stocks")
      .select("id, symbol")

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!stocks || stocks.length === 0) {
      return NextResponse.json({ data: { updated: 0 } })
    }

    // Update prices for each stock
    const updates: { id: string; price: number }[] = []
    for (const stock of stocks) {
      try {
        const quote = await getStockQuote(stock.symbol)
        if (quote) {
          updates.push({ id: stock.id, price: quote.price })
        }
      } catch (err) {
        console.error(`Failed to fetch price for ${stock.symbol}:`, err)
      }
    }

    // Batch update prices
    for (const update of updates) {
      await supabase
        .from("stocks")
        .update({
          current_price: update.price,
          last_updated: new Date().toISOString(),
        })
        .eq("id", update.id)
    }

    return NextResponse.json({
      data: {
        updated: updates.length,
        total: stocks.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
