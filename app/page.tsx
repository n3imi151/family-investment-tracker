import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, DollarSign, PieChart } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-primary rounded-full">
              <TrendingUp className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Family Investment Portfolio Tracker
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Track shared family investments with automatic ownership percentages
            based on contributions. Everyone sees their fair share.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <div className="p-2 bg-primary/10 rounded-lg w-fit mb-4">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Track Contributions
            </h3>
            <p className="text-muted-foreground">
              Record contributions from each family member. The system
              automatically tracks who contributed what and when.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <div className="p-2 bg-primary/10 rounded-lg w-fit mb-4">
              <PieChart className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Automatic Ownership
            </h3>
            <p className="text-muted-foreground">
              Ownership percentages are calculated automatically based on
              contributions at the time of each stock purchase.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <div className="p-2 bg-primary/10 rounded-lg w-fit mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Family Transparency
            </h3>
            <p className="text-muted-foreground">
              Everyone can see the portfolio value, their share, and detailed
              breakdowns. Full transparency for the whole family.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Add Family Members</h3>
                <p className="text-muted-foreground">
                  Register family members who will contribute to the joint
                  investment account.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Record Contributions</h3>
                <p className="text-muted-foreground">
                  When someone adds money to the pool, record their contribution
                  with the date and amount.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Buy Stocks</h3>
                <p className="text-muted-foreground">
                  When purchasing stocks, allocate from the cash pool. Each
                  member's ownership is based on their allocation.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold mb-1">Track & Report</h3>
                <p className="text-muted-foreground">
                  View real-time portfolio values, per-member breakdowns, and
                  generate reports for tax season.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
