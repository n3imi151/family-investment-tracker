"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/components/providers"
import { useToast } from "@/components/ui/use-toast"
import { Stock, Transaction, TransactionAllocation, FamilyMember } from "@/types"
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils"

type TransactionWithDetails = Transaction & {
  stock: Stock
  allocations: (TransactionAllocation & { member: FamilyMember })[]
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStock, setFilterStock] = useState<string>("all")
  const supabase = createClient()
  const { toast } = useToast()
  const isAdmin = user?.familyMember?.is_admin ?? false

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [transactionsRes, stocksRes, allocationsRes, membersRes] = await Promise.all([
        supabase.from("transactions").select("*, stock:stocks(*)").order("date", { ascending: false }),
        supabase.from("stocks").select("*").order("symbol"),
        supabase.from("transaction_allocations").select("*"),
        supabase.from("family_members").select("*"),
      ])

      const rawTransactions = (transactionsRes.data || []) as (Transaction & { stock: Stock })[]
      const allAllocations = (allocationsRes.data || []) as TransactionAllocation[]
      const members = (membersRes.data || []) as FamilyMember[]

      // Attach allocations with member data to transactions
      const transactionsWithDetails = rawTransactions.map((t) => ({
        ...t,
        allocations: allAllocations
          .filter((a) => a.transaction_id === t.id)
          .map((a) => ({
            ...a,
            member: members.find((m) => m.id === a.member_id)!,
          })),
      }))

      setTransactions(transactionsWithDetails)
      setStocks(stocksRes.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (transaction: Transaction) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)

      if (error) throw error
      toast({ title: "Transaction deleted successfully" })
      fetchData()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false
    if (filterStock !== "all" && t.stock_id !== filterStock) return false
    return true
  })

  const totalBuys = filteredTransactions
    .filter((t) => t.type === "buy")
    .reduce((sum, t) => sum + t.total_amount, 0)

  const totalSells = filteredTransactions
    .filter((t) => t.type === "sell")
    .reduce((sum, t) => sum + t.total_amount, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
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
        <h1 className="text-3xl font-bold">Transactions</h1>
        {isAdmin && (
          <Link href="/transactions/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Buys</CardTitle>
            <Badge>Buy</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBuys)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter((t) => t.type === "buy").length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sells</CardTitle>
            <Badge variant="secondary">Sell</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSells)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter((t) => t.type === "sell").length} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStock} onValueChange={setFilterStock}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stocks</SelectItem>
                {stocks.map((stock) => (
                  <SelectItem key={stock.id} value={stock.id}>
                    {stock.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Allocations</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={transaction.type === "buy" ? "default" : "secondary"}
                    >
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/stocks/${transaction.stock.symbol}`}
                      className="font-medium hover:underline"
                    >
                      {transaction.stock.symbol}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(transaction.quantity, 4)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(transaction.price_per_share)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(transaction.total_amount)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-0.5">
                      {transaction.allocations.slice(0, 2).map((alloc) => (
                        <div key={alloc.id} className="text-muted-foreground">
                          {alloc.member?.name}: {formatCurrency(alloc.amount)}
                        </div>
                      ))}
                      {transaction.allocations.length > 2 && (
                        <div className="text-muted-foreground">
                          +{transaction.allocations.length - 2} more
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this {transaction.type}{" "}
                              transaction for {transaction.stock.symbol}? This will also
                              delete all associated allocations.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(transaction)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 8 : 7}
                    className="text-center text-muted-foreground"
                  >
                    No transactions found.
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
