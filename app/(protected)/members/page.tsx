"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { useAuth } from "@/components/providers"
import { useToast } from "@/components/ui/use-toast"
import { FamilyMember, MemberCashPool } from "@/types"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function MembersPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [cashPools, setCashPools] = useState<MemberCashPool[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  const isAdmin = user?.familyMember?.is_admin ?? false

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const { data: membersData } = await supabase
        .from("family_members")
        .select("*")
        .order("created_at", { ascending: true })

      setMembers(membersData || [])

      // Fetch cash pool data
      const { data: cashData } = await supabase
        .from("member_cash_pool")
        .select("*")

      setCashPools(cashData || [])
    } catch (error) {
      console.error("Error fetching members:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const isAdminMember = formData.get("is_admin") === "on"

    try {
      if (editingMember) {
        const { error } = await supabase
          .from("family_members")
          .update({ name, email, is_admin: isAdminMember })
          .eq("id", editingMember.id)

        if (error) throw error
        toast({ title: "Member updated successfully" })
      } else {
        const { error } = await supabase.from("family_members").insert({
          name,
          email,
          is_admin: isAdminMember,
        })

        if (error) throw error
        toast({ title: "Member added successfully" })
      }

      setDialogOpen(false)
      setEditingMember(null)
      fetchMembers()
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

  const handleDelete = async (member: FamilyMember) => {
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", member.id)

      if (error) throw error
      toast({ title: "Member deleted successfully" })
      fetchMembers()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    }
  }

  const openEditDialog = (member: FamilyMember) => {
    setEditingMember(member)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingMember(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Family Members</h1>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingMember(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? "Edit Member" : "Add New Member"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingMember?.name || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingMember?.email || ""}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_admin"
                    name="is_admin"
                    defaultChecked={editingMember?.is_admin || false}
                  />
                  <Label htmlFor="is_admin">Admin privileges</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingMember ? (
                      "Save Changes"
                    ) : (
                      "Add Member"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Total Contributions</TableHead>
                <TableHead className="text-right">Available Cash</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const cashPool = cashPools.find((c) => c.member_id === member.id)
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={member.is_admin ? "default" : "secondary"}>
                        {member.is_admin ? "Admin" : "Member"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(cashPool?.total_contributions || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(cashPool?.available_cash || 0)}
                    </TableCell>
                    <TableCell>{formatDate(member.created_at)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {member.name}? This
                                  will also delete all their contributions and
                                  transaction allocations.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(member)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {members.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="text-center text-muted-foreground"
                  >
                    No family members yet. Add your first member to get started.
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
