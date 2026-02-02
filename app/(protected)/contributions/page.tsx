"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Trash2, Loader2, DollarSign } from "lucide-react"
import { useAuth } from "@/components/providers"
import { useToast } from "@/components/ui/use-toast"
import { FamilyMember, Contribution } from "@/types"
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils"

export default function ContributionsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [contributions, setContributions] = useState<(Contribution & { member: FamilyMember })[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string>("")
  const [filterMemberId, setFilterMemberId] = useState<string>("all")
  const supabase = createClient()
  const { toast } = useToast()
  const isAdmin = user?.familyMember?.is_admin ?? false

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [membersRes, contributionsRes] = await Promise.all([
        supabase.from("family_members").select("*").order("name"),
        supabase
          .from("contributions")
          .select("*, member:family_members(*)")
          .order("date", { ascending: false }),
      ])

      setMembers(membersRes.data || [])
      setContributions(contributionsRes.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)

    const formData = new FormData(e.currentTarget)
    const memberId = selectedMemberId
    const amount = parseFloat(formData.get("amount") as string)
    const date = formData.get("date") as string
    const notes = formData.get("notes") as string

    try {
      const { error } = await supabase.from("contributions").insert({
        member_id: memberId,
        amount,
        date,
        notes: notes || null,
      })

      if (error) throw error
      toast({ title: "Contribution added successfully" })
      setDialogOpen(false)
      setSelectedMemberId("")
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

  const handleDelete = async (contribution: Contribution) => {
    try {
      const { error } = await supabase
        .from("contributions")
        .delete()
        .eq("id", contribution.id)

      if (error) throw error
      toast({ title: "Contribution deleted successfully" })
      fetchData()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    }
  }

  const filteredContributions = contributions.filter(
    (c) => filterMemberId === "all" || c.member_id === filterMemberId
  )

  const totalContributions = filteredContributions.reduce(
    (sum, c) => sum + c.amount,
    0
  )

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
        <h1 className="text-3xl font-bold">Contributions</h1>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Contribution
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contribution</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Member</Label>
                  <Select
                    value={selectedMemberId}
                    onValueChange={setSelectedMemberId}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={formatDateInput(new Date())}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Add any notes..."
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
                  <Button type="submit" disabled={formLoading || !selectedMemberId}>
                    {formLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add Contribution"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {filterMemberId === "all" ? "Total Contributions" : "Filtered Total"}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalContributions)}
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredContributions.length} contribution(s)
          </p>
        </CardContent>
      </Card>

      {/* Contributions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contribution History</CardTitle>
          <Select value={filterMemberId} onValueChange={setFilterMemberId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContributions.map((contribution) => (
                <TableRow key={contribution.id}>
                  <TableCell>{formatDate(contribution.date)}</TableCell>
                  <TableCell className="font-medium">
                    {contribution.member?.name}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(contribution.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {contribution.notes || "-"}
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
                            <AlertDialogTitle>Delete Contribution</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this{" "}
                              {formatCurrency(contribution.amount)} contribution from{" "}
                              {contribution.member?.name}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(contribution)}
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
              {filteredContributions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 5 : 4}
                    className="text-center text-muted-foreground"
                  >
                    No contributions found.
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
