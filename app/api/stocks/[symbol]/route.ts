import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStockQuote } from "@/lib/stocks-api"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const supabase = createClient()
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
    // Get stock from database
    const { data: stock, error } = await supabase
      .from("stocks")
      .select("*")
      .eq("symbol", symbol)
      .single()

    if (error || !stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 })
    }

    // Optionally fetch live quote
    const quote = await getStockQuote(symbol)

    return NextResponse.json({
      data: {
        ...stock,
        liveQuote: quote,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const supabase = createClient()
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()

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
    const { error } = await supabase
      .from("stocks")
      .delete()
      .eq("symbol", symbol)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { deleted: true } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
