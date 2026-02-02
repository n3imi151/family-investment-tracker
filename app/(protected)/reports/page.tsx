"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Download, TrendingUp, TrendingDown } from "lucide-react"
import {
  FamilyMember,
  Contribution,
  Stock,
  Transaction,
  TransactionAllocation,
  PortfolioSummary,
} from "@/types"
import { calculatePortfolioSummary } from "@/lib/calculations"
import {
  formatCurrency,
  formatPercent,
  getGainLossColor,
} from "@/lib/utils"

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [contributions, setContributions] = useState<(Contribution & { member: FamilyMember })[]>([])
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const supabase = createClient()

  const years = Array.from(
    { length: 5 },
    (_, i) => (new Date().getFullYear() - i).toString()
  )

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [membersRes, contributionsRes, stocksRes, transactionsRes, allocationsRes] =
        await Promise.all([
          supabase.from("family_members").select("*"),
          supabase
            .from("contributions")
            .select("*, member:family_members(*)")
            .gte("date", `${year}-01-01`)
            .lte("date", `${year}-12-31`)
            .order("date"),
          supabase.from("stocks").select("*"),
          supabase.from("transactions").select("*"),
          supabase.from("transaction_allocations").select("*"),
        ])

      const members = (membersRes.data || []) as FamilyMember[]
      const allContributions = (contributionsRes.data || []) as (Contribution & { member: FamilyMember })[]
      const stocks = (stocksRes.data || []) as Stock[]
      const transactions = (transactionsRes.data || []) as Transaction[]
      const allocations = (allocationsRes.data || []) as TransactionAllocation[]

      // Get all contributions for summary calculation
      const { data: allContribsForCalc } = await supabase
        .from("contributions")
        .select("*")

      const portfolioSummary = calculatePortfolioSummary({
        members,
        contributions: allContribsForCalc || [],
        stocks,
        transactions,
        allocations,
      })

      setSummary(portfolioSummary)
      setContributions(allContributions)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!summary) return

    const rows = [
      ["Member Report - " + year],
      [],
      ["Member", "Total Contributions", "Current Value", "Available Cash", "Gain/Loss", "Gain/Loss %", "Portfolio Share"],
      ...summary.memberBreakdown.map((m) => [
        m.memberName,
        m.totalContributions.toFixed(2),
        m.totalValue.toFixed(2),
        m.availableCash.toFixed(2),
        m.gainLoss.toFixed(2),
        (m.gainLossPercentage).toFixed(2) + "%",
        (m.ownershipPercentage).toFixed(2) + "%",
      ]),
      [],
      ["Total", "", summary.totalValue.toFixed(2), summary.totalCash.toFixed(2), summary.totalGainLoss.toFixed(2), (summary.totalGainLossPercentage).toFixed(2) + "%", "100%"],
    ]

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((row) => row.join(",")).join("\n")

    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csvContent))
    link.setAttribute("download", `portfolio-report-${year}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculate contributions by month
  const contributionsByMonth = contributions.reduce(
    (acc, c) => {
      const month = new Date(c.date).toLocaleString("default", { month: "short" })
      if (!acc[month]) acc[month] = 0
      acc[month] += c.amount
      return acc
    },
    {} as Record<string, number>
  )

  // Calculate contributions by member for the year
  const contributionsByMember = contributions.reduce(
    (acc, c) => {
      const name = c.member?.name || "Unknown"
      if (!acc[name]) acc[name] = 0
      acc[name] += c.amount
      return acc
    },
    {} as Record<string, number>
  )

  const totalYearContributions = contributions.reduce((sum, c) => sum + c.amount, 0)

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
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary?.totalValue || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cost Basis</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary?.totalCostBasis || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
              <p
                className={`text-2xl font-bold ${getGainLossColor(
                  summary?.totalGainLoss || 0
                )}`}
              >
                {formatCurrency(summary?.totalGainLoss || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cash Available</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary?.totalCash || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Member Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Total Contributions</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">Available Cash</TableHead>
                <TableHead className="text-right">Gain/Loss</TableHead>
                <TableHead className="text-right">Return %</TableHead>
                <TableHead className="text-right">Portfolio Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary?.memberBreakdown.map((member) => (
                <TableRow key={member.memberId}>
                  <TableCell className="font-medium">{member.memberName}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(member.totalContributions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(member.totalValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(member.availableCash)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={getGainLossColor(member.gainLoss)}>
                      {formatCurrency(member.gainLoss)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={getGainLossColor(member.gainLossPercentage)}>
                      {formatPercent(member.gainLossPercentage)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(member.ownershipPercentage)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Year Contributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{year} Contributions by Member</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(contributionsByMember).map(([name, amount]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {totalYearContributions > 0
                        ? formatPercent((amount / totalYearContributions) * 100)
                        : "0%"}
                    </TableCell>
                  </TableRow>
                ))}
                {Object.keys(contributionsByMember).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No contributions in {year}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total {year}</span>
                <span className="text-xl font-bold">
                  {formatCurrency(totalYearContributions)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{year} Contributions by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(contributionsByMonth).map(([month, amount]) => (
                  <TableRow key={month}>
                    <TableCell className="font-medium">{month}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {Object.keys(contributionsByMonth).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No contributions in {year}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
