import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStockQuote } from "@/lib/stocks-api"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const supabase = await createClient()
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get stock by symbol
    const { data: stock, error: fetchError } = await supabase
      .from("stocks")
      .select("id")
      .eq("symbol", symbol)
      .single()

    if (fetchError || !stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 })
    }

    // Fetch current price
    const quote = await getStockQuote(symbol)
    if (!quote) {
      return NextResponse.json(
        { error: "Failed to fetch stock price" },
        { status: 500 }
      )
    }

    // Update stock price
    const { error: updateError } = await supabase
      .from("stocks")
      .update({
        current_price: quote.price,
        last_updated: new Date().toISOString(),
      })
      .eq("id", stock.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        symbol,
        price: quote.price,
        updated: true,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
