"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plus,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from "lucide-react"
import { useAuth } from "@/components/providers"
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
  getGainLossColor,
} from "@/lib/utils"

export default function StocksPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stocks, setStocks] = useState<StockWithOwnership[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  const isAdmin = user?.familyMember?.is_admin ?? false

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [stocksRes, membersRes, transactionsRes, allocationsRes] = await Promise.all([
        supabase.from("stocks").select("*").order("symbol"),
        supabase.from("family_members").select("*"),
        supabase.from("transactions").select("*"),
        supabase.from("transaction_allocations").select("*"),
      ])

      const rawStocks = (stocksRes.data || []) as Stock[]
      const members = (membersRes.data || []) as FamilyMember[]
      const transactions = (transactionsRes.data || []) as Transaction[]
      const allocations = (allocationsRes.data || []) as TransactionAllocation[]

      // Calculate ownership for each stock
      const stocksWithOwnership = rawStocks.map((stock) =>
        calculateStockWithOwnership(stock, {
          members,
          contributions: [],
          stocks: rawStocks,
          transactions,
          allocations,
        })
      )

      setStocks(stocksWithOwnership)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)

    const formData = new FormData(e.currentTarget)
    const symbol = (formData.get("symbol") as string).toUpperCase().trim()
    const name = formData.get("name") as string

    try {
      // Check if stock already exists
      const { data: existing } = await supabase
        .from("stocks")
        .select("id")
        .eq("symbol", symbol)
        .single()

      if (existing) {
        toast({
          variant: "destructive",
          title: "Stock already exists",
          description: `${symbol} is already in your portfolio.`,
        })
        return
      }

      const { error } = await supabase.from("stocks").insert({
        symbol,
        name,
      })

      if (error) throw error
      toast({ title: `${symbol} added to portfolio` })
      setDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setFormLoading(false)
    }
  }

  const refreshPrices = async () => {
    setRefreshing(true)
    try {
      const response = await fetch("/api/stocks/refresh", { method: "POST" })
      if (!response.ok) throw new Error("Failed to refresh prices")
      toast({ title: "Stock prices updated" })
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

  const totalValue = stocks.reduce((sum, s) => sum + s.currentValue, 0)
  const totalCostBasis = stocks.reduce((sum, s) => sum + s.costBasis, 0)
  const totalGainLoss = totalValue - totalCostBasis

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stocks</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshPrices} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Prices
          </Button>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stock
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Stock</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddStock} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Stock Symbol</Label>
                    <Input
                      id="symbol"
                      name="symbol"
                      placeholder="AAPL"
                      className="uppercase"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Apple Inc."
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Add Stock"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              {stocks.filter((s) => s.sharesOwned > 0).length} stocks held
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Basis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCostBasis)}</div>
            <p className="text-xs text-muted-foreground">Amount invested</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            {totalGainLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGainLossColor(totalGainLoss)}`}>
              {formatCurrency(totalGainLoss)}
            </div>
            <p className={`text-xs ${getGainLossColor(totalGainLoss)}`}>
              {totalCostBasis > 0
                ? formatPercent((totalGainLoss / totalCostBasis) * 100)
                : "0%"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stocks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Cost Basis</TableHead>
                <TableHead className="text-right">Gain/Loss</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((stock) => (
                <TableRow key={stock.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {stock.symbol}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{stock.name}</TableCell>
                  <TableCell className="text-right">
                    {stock.current_price
                      ? formatCurrency(stock.current_price)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {stock.sharesOwned > 0 ? formatNumber(stock.sharesOwned, 4) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {stock.currentValue > 0
                      ? formatCurrency(stock.currentValue)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {stock.costBasis > 0 ? formatCurrency(stock.costBasis) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {stock.costBasis > 0 ? (
                      <div className={getGainLossColor(stock.gainLoss)}>
                        <div>{formatCurrency(stock.gainLoss)}</div>
                        <div className="text-xs">
                          {formatPercent(stock.gainLossPercentage)}
                        </div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/stocks/${stock.symbol}`}>
                      <Button variant="ghost" size="sm">
                        Details
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {stocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No stocks in portfolio. Add a stock to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
