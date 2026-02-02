import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStockQuote, searchStocks } from "@/lib/stocks-api"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")

  if (query) {
    // Search for stocks
    try {
      const results = await searchStocks(query)
      return NextResponse.json({ data: results })
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to search stocks" },
        { status: 500 }
      )
    }
  }

  // Return all stocks from database
  const supabase = createClient()
  const { data, error } = await supabase
    .from("stocks")
    .select("*")
    .order("symbol")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: familyMember } = await supabase
    .from("family_members")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()

  if (!familyMember?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { symbol, name } = body

    if (!symbol || !name) {
      return NextResponse.json(
        { error: "Symbol and name are required" },
        { status: 400 }
      )
    }

    // Fetch current price
    const quote = await getStockQuote(symbol.toUpperCase())

    const { data, error } = await supabase
      .from("stocks")
      .insert({
        symbol: symbol.toUpperCase(),
        name,
        current_price: quote?.price || null,
        last_updated: quote ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
