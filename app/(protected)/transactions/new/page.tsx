"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, Plus, Minus, AlertCircle } from "lucide-react"
import { useAuth } from "@/components/providers"
import { useToast } from "@/components/ui/use-toast"
import {
  Stock,
  FamilyMember,
  MemberCashPool,
  Transaction,
  TransactionAllocation,
} from "@/types"
import { calculateSellAllocations } from "@/lib/calculations"
import { formatCurrency, formatDateInput, formatNumber } from "@/lib/utils"

interface AllocationInput {
  memberId: string
  amount: string
}

export default function NewTransactionPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [cashPools, setCashPools] = useState<MemberCashPool[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [allocationsData, setAllocationsData] = useState<TransactionAllocation[]>([])

  const [transactionType, setTransactionType] = useState<"buy" | "sell">("buy")
  const [selectedStock, setSelectedStock] = useState("")
  const [quantity, setQuantity] = useState("")
  const [pricePerShare, setPricePerShare] = useState("")
  const [date, setDate] = useState(formatDateInput(new Date()))
  const [notes, setNotes] = useState("")
  const [allocations, setAllocations] = useState<AllocationInput[]>([])

  const supabase = createClient()
  const { toast } = useToast()
  const isAdmin = user?.familyMember?.is_admin ?? false

  useEffect(() => {
    if (!isAdmin) {
      router.push("/transactions")
      return
    }
    fetchData()
  }, [isAdmin])

  const fetchData = async () => {
    try {
      const [stocksRes, membersRes, cashPoolRes, transactionsRes, allocationsRes] =
        await Promise.all([
          supabase.from("stocks").select("*").order("symbol"),
          supabase.from("family_members").select("*").order("name"),
          supabase.from("member_cash_pool").select("*"),
          supabase.from("transactions").select("*"),
          supabase.from("transaction_allocations").select("*"),
        ])

      setStocks(stocksRes.data || [])
      setMembers(membersRes.data || [])
      setCashPools(cashPoolRes.data || [])
      setTransactions(transactionsRes.data || [])
      setAllocationsData(allocationsRes.data || [])

      // Initialize allocations with one empty row
      if (membersRes.data && membersRes.data.length > 0) {
        setAllocations([{ memberId: membersRes.data[0].id, amount: "" }])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = parseFloat(quantity || "0") * parseFloat(pricePerShare || "0")
  const totalAllocated = allocations.reduce(
    (sum, a) => sum + parseFloat(a.amount || "0"),
    0
  )
  const remainingToAllocate = totalAmount - totalAllocated

  const addAllocation = () => {
    const availableMembers = members.filter(
      (m) => !allocations.find((a) => a.memberId === m.id)
    )
    if (availableMembers.length > 0) {
      setAllocations([
        ...allocations,
        { memberId: availableMembers[0].id, amount: "" },
      ])
    }
  }

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index))
  }

  const updateAllocation = (
    index: number,
    field: "memberId" | "amount",
    value: string
  ) => {
    const newAllocations = [...allocations]
    newAllocations[index] = { ...newAllocations[index], [field]: value }
    setAllocations(newAllocations)
  }

  const autoAllocateSell = () => {
    if (!selectedStock || !quantity || !pricePerShare) return

    const sellAllocations = calculateSellAllocations(
      selectedStock,
      parseFloat(quantity),
      parseFloat(pricePerShare),
      {
        members,
        contributions: [],
        stocks,
        transactions,
        allocations: allocationsData,
      }
    )

    setAllocations(
      sellAllocations.map((a) => ({
        memberId: a.member_id,
        amount: a.amount.toFixed(2),
      }))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStock) {
      toast({ variant: "destructive", title: "Please select a stock" })
      return
    }

    if (Math.abs(remainingToAllocate) > 0.01) {
      toast({
        variant: "destructive",
        title: "Allocation mismatch",
        description: "Total allocation must equal the transaction amount",
      })
      return
    }

    setSubmitting(true)

    try {
      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          stock_id: selectedStock,
          type: transactionType,
          date,
          quantity: parseFloat(quantity),
          price_per_share: parseFloat(pricePerShare),
          notes: notes || null,
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      // Create allocations
      const allocationInserts = allocations
        .filter((a) => parseFloat(a.amount) > 0)
        .map((a) => ({
          transaction_id: transaction.id,
          member_id: a.memberId,
          amount: parseFloat(a.amount),
          percentage: parseFloat(a.amount) / totalAmount,
        }))

      const { error: allocationsError } = await supabase
        .from("transaction_allocations")
        .insert(allocationInserts)

      if (allocationsError) throw allocationsError

      toast({ title: "Transaction created successfully" })
      router.push("/transactions")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getCashAvailable = (memberId: string) => {
    const pool = cashPools.find((p) => p.member_id === memberId)
    return pool?.available_cash || 0
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">New Transaction</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>
              Record a stock buy or sell transaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Transaction Type */}
            <Tabs
              value={transactionType}
              onValueChange={(v) => setTransactionType(v as "buy" | "sell")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy">Buy</TabsTrigger>
                <TabsTrigger value="sell">Sell</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Stock Selection */}
            <div className="space-y-2">
              <Label>Stock</Label>
              <Select value={selectedStock} onValueChange={setSelectedStock}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a stock" />
                </SelectTrigger>
                <SelectContent>
                  {stocks.map((stock) => (
                    <SelectItem key={stock.id} value={stock.id}>
                      {stock.symbol} - {stock.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity and Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price per Share</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={pricePerShare}
                  onChange={(e) => setPricePerShare(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Total Amount */}
            {totalAmount > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Amount
                  </span>
                  <span className="text-xl font-bold">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Allocations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>
                  {transactionType === "buy"
                    ? "Allocate from Cash Pool"
                    : "Distribute Proceeds"}
                </Label>
                {transactionType === "sell" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={autoAllocateSell}
                  >
                    Auto-allocate by Ownership
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {allocations.map((allocation, index) => {
                  const cashAvailable = getCashAvailable(allocation.memberId)
                  const allocationAmount = parseFloat(allocation.amount || "0")
                  const isOverBudget =
                    transactionType === "buy" && allocationAmount > cashAvailable

                  return (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Select
                          value={allocation.memberId}
                          onValueChange={(v) =>
                            updateAllocation(index, "memberId", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map((member) => (
                              <SelectItem
                                key={member.id}
                                value={member.id}
                                disabled={
                                  allocation.memberId !== member.id &&
                                  allocations.some((a) => a.memberId === member.id)
                                }
                              >
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {transactionType === "buy" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Available: {formatCurrency(cashAvailable)}
                          </p>
                        )}
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={allocation.amount}
                          onChange={(e) =>
                            updateAllocation(index, "amount", e.target.value)
                          }
                          className={isOverBudget ? "border-red-500" : ""}
                        />
                        {isOverBudget && (
                          <p className="text-xs text-red-500 mt-1">
                            Exceeds available
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAllocation(index)}
                        disabled={allocations.length === 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              {allocations.length < members.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAllocation}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              )}

              {/* Allocation Summary */}
              {totalAmount > 0 && (
                <div
                  className={`p-4 rounded-lg ${
                    Math.abs(remainingToAllocate) < 0.01
                      ? "bg-green-50 border border-green-200"
                      : "bg-yellow-50 border border-yellow-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Allocated</span>
                    <span className="font-medium">
                      {formatCurrency(totalAllocated)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm">Remaining</span>
                    <span
                      className={`font-medium ${
                        Math.abs(remainingToAllocate) < 0.01
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {formatCurrency(remainingToAllocate)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Link href="/transactions">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  !selectedStock ||
                  !quantity ||
                  !pricePerShare ||
                  Math.abs(remainingToAllocate) > 0.01
                }
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Transaction
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
