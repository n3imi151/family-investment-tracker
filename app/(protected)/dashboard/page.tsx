"use client"

import { useEffect, useState } from "react"
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  PieChart,
  ArrowRight,
} from "lucide-react"
import { useAuth } from "@/components/providers"
import {
  FamilyMember,
  Contribution,
  Stock,
  Transaction,
  TransactionAllocation,
  PortfolioSummary,
  ActivityItem,
} from "@/types"
import { calculatePortfolioSummary } from "@/lib/calculations"
import {
  formatCurrency,
  formatPercent,
  formatDate,
  getGainLossColor,
  getGainLossBgColor,
} from "@/lib/utils"

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch all required data
      const [membersRes, contributionsRes, stocksRes, transactionsRes, allocationsRes] =
        await Promise.all([
          supabase.from("family_members").select("*"),
          supabase.from("contributions").select("*"),
          supabase.from("stocks").select("*"),
          supabase.from("transactions").select("*"),
          supabase.from("transaction_allocations").select("*"),
        ])

      const members = (membersRes.data || []) as FamilyMember[]
      const contributions = (contributionsRes.data || []) as Contribution[]
      const stocks = (stocksRes.data || []) as Stock[]
      const transactions = (transactionsRes.data || []) as Transaction[]
      const allocations = (allocationsRes.data || []) as TransactionAllocation[]

      // Calculate portfolio summary
      const portfolioSummary = calculatePortfolioSummary({
        members,
        contributions,
        stocks,
        transactions,
        allocations,
      })
      setSummary(portfolioSummary)

      // Build recent activity
      const activity: ActivityItem[] = []

      // Add contributions to activity
      contributions.slice(-5).forEach((c) => {
        const member = members.find((m) => m.id === c.member_id)
        activity.push({
          id: c.id,
          type: "contribution",
          date: c.date,
          description: `${member?.name || "Unknown"} contributed`,
          amount: c.amount,
          memberName: member?.name,
        })
      })

      // Add transactions to activity
      transactions.slice(-5).forEach((t) => {
        const stock = stocks.find((s) => s.id === t.stock_id)
        activity.push({
          id: t.id,
          type: t.type,
          date: t.date,
          description: `${t.type === "buy" ? "Bought" : "Sold"} ${t.quantity} ${stock?.symbol || ""}`,
          amount: t.total_amount,
          stockSymbol: stock?.symbol,
        })
      })

      // Sort by date descending
      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecentActivity(activity.slice(0, 5))
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {user?.familyMember?.is_admin && (
          <Link href="/transactions/new">
            <Button>New Transaction</Button>
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Including {formatCurrency(summary?.totalCash || 0)} cash
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            {(summary?.totalGainLoss || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGainLossColor(summary?.totalGainLoss || 0)}`}>
              {formatCurrency(summary?.totalGainLoss || 0)}
            </div>
            <p className={`text-xs ${getGainLossColor(summary?.totalGainLossPercentage || 0)}`}>
              {(summary?.totalGainLossPercentage || 0) >= 0 ? "+" : ""}
              {formatPercent(summary?.totalGainLossPercentage || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Basis</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalCostBasis || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Invested in stocks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.memberBreakdown?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Contributing members
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Member Breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Member Breakdown</CardTitle>
            <Link href="/members">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary?.memberBreakdown?.map((member) => (
                  <TableRow key={member.memberId}>
                    <TableCell className="font-medium">{member.memberName}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(member.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={getGainLossColor(member.gainLoss)}>
                        {formatCurrency(member.gainLoss)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercent(member.ownershipPercentage)}
                    </TableCell>
                  </TableRow>
                ))}
                {(!summary?.memberBreakdown || summary.memberBreakdown.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No members yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        activity.type === "contribution"
                          ? "success"
                          : activity.type === "buy"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {activity.type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(activity.date)}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(activity.amount)}
                  </span>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-center text-muted-foreground">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Your Portfolio (for current user) */}
      {user?.familyMember && summary?.memberBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Your Portfolio Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const myData = summary.memberBreakdown.find(
                (m) => m.memberId === user.familyMember?.id
              )
              if (!myData) {
                return (
                  <p className="text-muted-foreground">
                    You haven't contributed yet.
                  </p>
                )
              }
              return (
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Contributions</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(myData.totalContributions)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Value</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(myData.totalValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Gain/Loss</p>
                    <p className={`text-2xl font-bold ${getGainLossColor(myData.gainLoss)}`}>
                      {formatCurrency(myData.gainLoss)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Portfolio Share</p>
                    <p className="text-2xl font-bold">
                      {formatPercent(myData.ownershipPercentage)}
                    </p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
