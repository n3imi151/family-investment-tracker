import {
  FamilyMember,
  Contribution,
  Stock,
  Transaction,
  TransactionAllocation,
  PortfolioSummary,
  MemberPortfolioSummary,
  StockWithOwnership,
  MemberCashPool,
} from '@/types'

interface CalculationData {
  members: FamilyMember[]
  contributions: Contribution[]
  stocks: Stock[]
  transactions: Transaction[]
  allocations: TransactionAllocation[]
}

// Calculate available cash per member
export function calculateMemberCash(data: CalculationData): Map<string, MemberCashPool> {
  const { members, contributions, transactions, allocations } = data
  const cashMap = new Map<string, MemberCashPool>()

  members.forEach((member) => {
    // Total contributions
    const totalContributions = contributions
      .filter((c) => c.member_id === member.id)
      .reduce((sum, c) => sum + c.amount, 0)

    // Total buy allocations
    const buyTransactionIds = new Set(
      transactions.filter((t) => t.type === 'buy').map((t) => t.id)
    )
    const totalBuys = allocations
      .filter((a) => a.member_id === member.id && buyTransactionIds.has(a.transaction_id))
      .reduce((sum, a) => sum + a.amount, 0)

    // Total sell allocations (proceeds returned)
    const sellTransactionIds = new Set(
      transactions.filter((t) => t.type === 'sell').map((t) => t.id)
    )
    const totalSells = allocations
      .filter((a) => a.member_id === member.id && sellTransactionIds.has(a.transaction_id))
      .reduce((sum, a) => sum + a.amount, 0)

    cashMap.set(member.id, {
      member_id: member.id,
      member_name: member.name,
      total_contributions: totalContributions,
      total_buys: totalBuys,
      total_sells: totalSells,
      available_cash: totalContributions - totalBuys + totalSells,
    })
  })

  return cashMap
}

// Calculate shares owned per member per stock
export function calculateMemberShares(
  data: CalculationData
): Map<string, Map<string, number>> {
  const { members, transactions, allocations } = data
  // Map: memberId -> stockId -> shares
  const sharesMap = new Map<string, Map<string, number>>()

  members.forEach((member) => {
    sharesMap.set(member.id, new Map())
  })

  // Process each transaction
  transactions.forEach((transaction) => {
    const transactionAllocations = allocations.filter(
      (a) => a.transaction_id === transaction.id
    )

    transactionAllocations.forEach((allocation) => {
      const memberShares = sharesMap.get(allocation.member_id)!
      const currentShares = memberShares.get(transaction.stock_id) || 0
      const sharesForAllocation = transaction.quantity * allocation.percentage

      if (transaction.type === 'buy') {
        memberShares.set(
          transaction.stock_id,
          currentShares + sharesForAllocation
        )
      } else {
        memberShares.set(
          transaction.stock_id,
          currentShares - sharesForAllocation
        )
      }
    })
  })

  return sharesMap
}

// Calculate ownership percentage per member per stock
export function calculateOwnershipPercentages(
  data: CalculationData
): Map<string, Map<string, number>> {
  const { stocks } = data
  const memberShares = calculateMemberShares(data)
  // Map: memberId -> stockId -> percentage
  const ownershipMap = new Map<string, Map<string, number>>()

  // Initialize ownership map
  memberShares.forEach((stockMap, memberId) => {
    ownershipMap.set(memberId, new Map())
  })

  // Calculate total shares per stock
  const totalSharesPerStock = new Map<string, number>()
  stocks.forEach((stock) => {
    let totalShares = 0
    memberShares.forEach((stockMap) => {
      totalShares += stockMap.get(stock.id) || 0
    })
    totalSharesPerStock.set(stock.id, totalShares)
  })

  // Calculate ownership percentages
  memberShares.forEach((stockMap, memberId) => {
    stockMap.forEach((shares, stockId) => {
      const totalShares = totalSharesPerStock.get(stockId) || 0
      const percentage = totalShares > 0 ? (shares / totalShares) * 100 : 0
      ownershipMap.get(memberId)!.set(stockId, percentage)
    })
  })

  return ownershipMap
}

// Calculate cost basis per member per stock
export function calculateCostBasis(
  data: CalculationData
): Map<string, Map<string, number>> {
  const { transactions, allocations } = data
  // Map: memberId -> stockId -> cost basis
  const costBasisMap = new Map<string, Map<string, number>>()

  allocations.forEach((allocation) => {
    const transaction = transactions.find((t) => t.id === allocation.transaction_id)
    if (!transaction) return

    if (!costBasisMap.has(allocation.member_id)) {
      costBasisMap.set(allocation.member_id, new Map())
    }

    const memberCostBasis = costBasisMap.get(allocation.member_id)!
    const currentCostBasis = memberCostBasis.get(transaction.stock_id) || 0

    if (transaction.type === 'buy') {
      memberCostBasis.set(transaction.stock_id, currentCostBasis + allocation.amount)
    } else {
      // For sells, reduce cost basis proportionally
      memberCostBasis.set(transaction.stock_id, currentCostBasis - allocation.amount)
    }
  })

  return costBasisMap
}

// Calculate full portfolio summary
export function calculatePortfolioSummary(data: CalculationData): PortfolioSummary {
  const { members, stocks } = data
  const memberCash = calculateMemberCash(data)
  const memberShares = calculateMemberShares(data)
  const costBasis = calculateCostBasis(data)

  let totalValue = 0
  let totalCostBasis = 0
  let totalCash = 0

  const memberBreakdown: MemberPortfolioSummary[] = members.map((member) => {
    const cash = memberCash.get(member.id)!
    const shares = memberShares.get(member.id)!
    const memberCostBasisMap = costBasis.get(member.id) || new Map()

    let currentStockValue = 0
    let memberTotalCostBasis = 0

    stocks.forEach((stock) => {
      const sharesOwned = shares.get(stock.id) || 0
      const price = stock.current_price || 0
      currentStockValue += sharesOwned * price
      memberTotalCostBasis += memberCostBasisMap.get(stock.id) || 0
    })

    const totalValue = currentStockValue + cash.available_cash
    const gainLoss = currentStockValue - memberTotalCostBasis
    const gainLossPercentage =
      memberTotalCostBasis > 0 ? (gainLoss / memberTotalCostBasis) * 100 : 0

    totalCash += cash.available_cash

    return {
      memberId: member.id,
      memberName: member.name,
      totalContributions: cash.total_contributions,
      currentStockValue,
      availableCash: cash.available_cash,
      totalValue,
      costBasis: memberTotalCostBasis,
      gainLoss,
      gainLossPercentage,
      ownershipPercentage: 0, // Will be calculated after totals
    }
  })

  // Calculate totals and ownership percentages
  totalValue = memberBreakdown.reduce((sum, m) => sum + m.totalValue, 0)
  totalCostBasis = memberBreakdown.reduce((sum, m) => sum + m.costBasis, 0)

  memberBreakdown.forEach((member) => {
    member.ownershipPercentage =
      totalValue > 0 ? (member.totalValue / totalValue) * 100 : 0
  })

  const totalGainLoss = totalValue - totalCash - totalCostBasis

  return {
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPercentage:
      totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0,
    totalCash,
    memberBreakdown,
  }
}

// Calculate stock details with ownership
export function calculateStockWithOwnership(
  stock: Stock,
  data: CalculationData
): StockWithOwnership {
  const { members, transactions, allocations } = data
  const memberShares = calculateMemberShares(data)
  const costBasis = calculateCostBasis(data)

  let totalShares = 0
  let totalCostBasis = 0

  const memberOwnership: StockWithOwnership['memberOwnership'] = []

  members.forEach((member) => {
    const shares = memberShares.get(member.id)?.get(stock.id) || 0
    const memberCostBasis = costBasis.get(member.id)?.get(stock.id) || 0
    const value = shares * (stock.current_price || 0)

    if (shares > 0) {
      totalShares += shares
      totalCostBasis += memberCostBasis
      memberOwnership.push({
        memberId: member.id,
        memberName: member.name,
        shares,
        value,
        percentage: 0, // Will be calculated after total
      })
    }
  })

  // Calculate percentages
  memberOwnership.forEach((mo) => {
    mo.percentage = totalShares > 0 ? (mo.shares / totalShares) * 100 : 0
  })

  const currentValue = totalShares * (stock.current_price || 0)
  const gainLoss = currentValue - totalCostBasis

  return {
    ...stock,
    sharesOwned: totalShares,
    currentValue,
    costBasis: totalCostBasis,
    gainLoss,
    gainLossPercentage: totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0,
    memberOwnership,
  }
}

// Calculate sell allocations based on current ownership
export function calculateSellAllocations(
  stockId: string,
  quantity: number,
  pricePerShare: number,
  data: CalculationData
): { member_id: string; amount: number; percentage: number }[] {
  const memberShares = calculateMemberShares(data)
  const allocations: { member_id: string; amount: number; percentage: number }[] = []

  // Get total shares for this stock
  let totalShares = 0
  memberShares.forEach((stockMap) => {
    totalShares += stockMap.get(stockId) || 0
  })

  if (totalShares === 0) return allocations

  const totalAmount = quantity * pricePerShare

  // Allocate proportionally to ownership
  memberShares.forEach((stockMap, memberId) => {
    const shares = stockMap.get(stockId) || 0
    if (shares > 0) {
      const percentage = shares / totalShares
      allocations.push({
        member_id: memberId,
        amount: totalAmount * percentage,
        percentage,
      })
    }
  })

  return allocations
}
