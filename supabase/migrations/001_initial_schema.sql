-- Family Investment Portfolio Tracker - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Family Members Table
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contributions Table
CREATE TABLE contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Stocks Table
CREATE TABLE stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    current_price DECIMAL(15, 4),
    last_updated TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions Table (buys and sells)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    date DATE NOT NULL,
    quantity DECIMAL(15, 6) NOT NULL CHECK (quantity > 0),
    price_per_share DECIMAL(15, 4) NOT NULL CHECK (price_per_share > 0),
    total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * price_per_share) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Transaction Allocations Table (ownership per transaction)
CREATE TABLE transaction_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    percentage DECIMAL(5, 4) NOT NULL CHECK (percentage > 0 AND percentage <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(transaction_id, member_id)
);

-- Indexes for better query performance
CREATE INDEX idx_contributions_member_id ON contributions(member_id);
CREATE INDEX idx_contributions_date ON contributions(date);
CREATE INDEX idx_transactions_stock_id ON transactions(stock_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transaction_allocations_transaction_id ON transaction_allocations(transaction_id);
CREATE INDEX idx_transaction_allocations_member_id ON transaction_allocations(member_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_stocks_symbol ON stocks(symbol);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_family_members_updated_at
    BEFORE UPDATE ON family_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at
    BEFORE UPDATE ON contributions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stocks_updated_at
    BEFORE UPDATE ON stocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_allocations ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is a family member
CREATE OR REPLACE FUNCTION is_family_member()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM family_members
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM family_members
        WHERE user_id = auth.uid() AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Family Members Policies
CREATE POLICY "Family members can view all members"
    ON family_members FOR SELECT
    USING (is_family_member());

CREATE POLICY "Admins can insert members"
    ON family_members FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update members"
    ON family_members FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete members"
    ON family_members FOR DELETE
    USING (is_admin());

-- Contributions Policies
CREATE POLICY "Family members can view all contributions"
    ON contributions FOR SELECT
    USING (is_family_member());

CREATE POLICY "Admins can insert contributions"
    ON contributions FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update contributions"
    ON contributions FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete contributions"
    ON contributions FOR DELETE
    USING (is_admin());

-- Stocks Policies
CREATE POLICY "Family members can view all stocks"
    ON stocks FOR SELECT
    USING (is_family_member());

CREATE POLICY "Admins can insert stocks"
    ON stocks FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update stocks"
    ON stocks FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete stocks"
    ON stocks FOR DELETE
    USING (is_admin());

-- Transactions Policies
CREATE POLICY "Family members can view all transactions"
    ON transactions FOR SELECT
    USING (is_family_member());

CREATE POLICY "Admins can insert transactions"
    ON transactions FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update transactions"
    ON transactions FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete transactions"
    ON transactions FOR DELETE
    USING (is_admin());

-- Transaction Allocations Policies
CREATE POLICY "Family members can view all allocations"
    ON transaction_allocations FOR SELECT
    USING (is_family_member());

CREATE POLICY "Admins can insert allocations"
    ON transaction_allocations FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update allocations"
    ON transaction_allocations FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete allocations"
    ON transaction_allocations FOR DELETE
    USING (is_admin());

-- Useful Views

-- View: Member Cash Pool
CREATE OR REPLACE VIEW member_cash_pool AS
SELECT
    fm.id AS member_id,
    fm.name AS member_name,
    COALESCE(c.total_contributions, 0) AS total_contributions,
    COALESCE(b.total_buys, 0) AS total_buys,
    COALESCE(s.total_sells, 0) AS total_sells,
    COALESCE(c.total_contributions, 0) - COALESCE(b.total_buys, 0) + COALESCE(s.total_sells, 0) AS available_cash
FROM family_members fm
LEFT JOIN (
    SELECT member_id, SUM(amount) AS total_contributions
    FROM contributions
    GROUP BY member_id
) c ON c.member_id = fm.id
LEFT JOIN (
    SELECT ta.member_id, SUM(ta.amount) AS total_buys
    FROM transaction_allocations ta
    JOIN transactions t ON t.id = ta.transaction_id
    WHERE t.type = 'buy'
    GROUP BY ta.member_id
) b ON b.member_id = fm.id
LEFT JOIN (
    SELECT ta.member_id, SUM(ta.amount) AS total_sells
    FROM transaction_allocations ta
    JOIN transactions t ON t.id = ta.transaction_id
    WHERE t.type = 'sell'
    GROUP BY ta.member_id
) s ON s.member_id = fm.id;

-- View: Stock Holdings Summary
CREATE OR REPLACE VIEW stock_holdings AS
SELECT
    s.id AS stock_id,
    s.symbol,
    s.name,
    s.current_price,
    COALESCE(buys.total_quantity, 0) - COALESCE(sells.total_quantity, 0) AS shares_owned,
    (COALESCE(buys.total_quantity, 0) - COALESCE(sells.total_quantity, 0)) * COALESCE(s.current_price, 0) AS current_value,
    COALESCE(buys.total_cost, 0) AS total_cost_basis,
    COALESCE(sells.total_proceeds, 0) AS total_sell_proceeds
FROM stocks s
LEFT JOIN (
    SELECT stock_id, SUM(quantity) AS total_quantity, SUM(total_amount) AS total_cost
    FROM transactions
    WHERE type = 'buy'
    GROUP BY stock_id
) buys ON buys.stock_id = s.id
LEFT JOIN (
    SELECT stock_id, SUM(quantity) AS total_quantity, SUM(total_amount) AS total_proceeds
    FROM transactions
    WHERE type = 'sell'
    GROUP BY stock_id
) sells ON sells.stock_id = s.id;

-- View: Member Stock Ownership
CREATE OR REPLACE VIEW member_stock_ownership AS
WITH buy_allocations AS (
    SELECT
        ta.member_id,
        t.stock_id,
        SUM(ta.amount) AS total_invested,
        SUM(ta.percentage * t.quantity) AS shares_from_buys
    FROM transaction_allocations ta
    JOIN transactions t ON t.id = ta.transaction_id
    WHERE t.type = 'buy'
    GROUP BY ta.member_id, t.stock_id
),
sell_allocations AS (
    SELECT
        ta.member_id,
        t.stock_id,
        SUM(ta.amount) AS total_sold_value,
        SUM(ta.percentage * t.quantity) AS shares_sold
    FROM transaction_allocations ta
    JOIN transactions t ON t.id = ta.transaction_id
    WHERE t.type = 'sell'
    GROUP BY ta.member_id, t.stock_id
)
SELECT
    fm.id AS member_id,
    fm.name AS member_name,
    s.id AS stock_id,
    s.symbol,
    s.name AS stock_name,
    s.current_price,
    COALESCE(ba.shares_from_buys, 0) - COALESCE(sa.shares_sold, 0) AS shares_owned,
    (COALESCE(ba.shares_from_buys, 0) - COALESCE(sa.shares_sold, 0)) * COALESCE(s.current_price, 0) AS current_value,
    COALESCE(ba.total_invested, 0) AS cost_basis,
    COALESCE(sa.total_sold_value, 0) AS realized_proceeds
FROM family_members fm
CROSS JOIN stocks s
LEFT JOIN buy_allocations ba ON ba.member_id = fm.id AND ba.stock_id = s.id
LEFT JOIN sell_allocations sa ON sa.member_id = fm.id AND sa.stock_id = s.id
WHERE COALESCE(ba.shares_from_buys, 0) - COALESCE(sa.shares_sold, 0) > 0
   OR COALESCE(ba.total_invested, 0) > 0;
