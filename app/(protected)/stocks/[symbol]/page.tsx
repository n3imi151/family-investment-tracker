"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Stock,
  FamilyMember,
  Transaction,
  TransactionAllocation,
  StockWithOwnership,
} from "@/types"
import { calculateStockWithOwnership } from "@/lib/calculations"
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  getGainLossColor,
} from "@/lib/utils"

export default function StockDetailPage() {
  const params = useParams()
  const symbol = params.symbol as string
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stock, setStock] = useState<StockWithOwnership | null>(null)
  const [transactions, setTransactions] = useState<(Transaction & { allocations: (TransactionAllocation & { member: FamilyMember })[] })[]>([])
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [symbol])

  const fetchData = async () => {
    try {
      // Fetch stock by symbol
      const { data: stockData } = await supabase
        .from("stocks")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .single()

      if (!stockData) {
        setStock(null)
        setLoading(false)
        return
      }

      // Fetch all related data
      const [membersRes, allStocksRes, transactionsRes, allocationsRes] = await Promise.all([
        supabase.from("family_members").select("*"),
        supabase.from("stocks").select("*"),
        supabase
          .from("transactions")
          .select("*")
          .eq("stock_id", stockData.id)
          .order("date", { ascending: false }),
        supabase.from("transaction_allocations").select("*, member:family_members(*)"),
      ])

      const members = (membersRes.data || []) as FamilyMember[]
      const allStocks = (allStocksRes.data || []) as Stock[]
      const allAllocations = (allocationsRes.data || []) as TransactionAllocation[]
      const stockTransactions = (transactionsRes.data || []) as Transaction[]

      // Calculate ownership
      const stockWithOwnership = calculateStockWithOwnership(stockData, {
        members,
        contributions: [],
        stocks: allStocks,
        transactions: stockTransactions,
        allocations: allAllocations,
      })

      setStock(stockWithOwnership)

      // Add allocations to transactions
      const transactionsWithAllocations = stockTransactions.map((t) => ({
        ...t,
        allocations: allAllocations
          .filter((a) => a.transaction_id === t.id)
          .map((a) => ({
            ...a,
            member: members.find((m) => m.id === a.member_id)!,
          })),
      }))

      setTransactions(transactionsWithAllocations)
    } catch (error) {
      console.error("Error fetching stock data:", error)
    } finally {
      setLoading(false)
    }
  }

  const refreshPrice = async () => {
    if (!stock) return
    setRefreshing(true)
    try {
      const response = await fetch(`/api/stocks/${stock.symbol}/refresh`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to refresh price")
      toast({ title: "Price updated" })
      fetchData()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!stock) {
    return (
      <div className="space-y-6">
        <Link href="/stocks">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stocks
          </Button>
        </Link>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Stock not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stocks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{stock.symbol}</h1>
              <Badge variant="outline">{stock.name}</Badge>
            </div>
            <p className="text-muted-foreground">
              Last updated: {stock.last_updated ? formatDate(stock.last_updated) : "Never"}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={refreshPrice} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh Price
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stock.current_price ? formatCurrency(stock.current_price) : "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shares Owned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stock.sharesOwned, 4)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stock.currentValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cost basis: {formatCurrency(stock.costBasis)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gain/Loss</CardTitle>
            {stock.gainLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGainLossColor(stock.gainLoss)}`}>
              {formatCurrency(stock.gainLoss)}
            </div>
            <p className={`text-xs ${getGainLossColor(stock.gainLossPercentage)}`}>
              {formatPercent(stock.gainLossPercentage)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ownership Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Ownership Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Ownership</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.memberOwnership.map((owner) => (
                  <TableRow key={owner.memberId}>
                    <TableCell className="font-medium">{owner.memberName}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(owner.shares, 4)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(owner.value)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercent(owner.percentage)}
                    </TableCell>
                  </TableRow>
                ))}
                {stock.memberOwnership.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No ownership data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={transaction.type === "buy" ? "default" : "secondary"}
                      >
                        {transaction.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(transaction.date)}
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(transaction.total_amount)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatNumber(transaction.quantity, 4)} shares @{" "}
                    {formatCurrency(transaction.price_per_share)}
                  </div>
                  <div className="pt-2 border-t space-y-1">
                    {transaction.allocations.map((alloc) => (
                      <div
                        key={alloc.id}
                        className="flex justify-between text-sm"
                      >
                        <span>{alloc.member?.name}</span>
                        <span>
                          {formatCurrency(alloc.amount)} ({formatPercent(alloc.percentage * 100)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center text-muted-foreground">
                  No transactions for this stock
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
