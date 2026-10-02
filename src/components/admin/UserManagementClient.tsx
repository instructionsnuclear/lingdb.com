"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@/lib/db/schema";
import {
  Search,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Users,
  Mail,
  Coins,
  Plus,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  deleteAdminUser,
  updateAdminUserRole,
  updateAdminUserCredits,
} from "@/lib/api/admin.api";

export default function UserManagementClient({
  initialUsers,
}: {
  initialUsers: User[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");

  // Modal state for granting credits
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditInput, setCreditInput] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(true); // true = Add to current, false = Set total

  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "USER" | "ADMIN" }) =>
      updateAdminUserRole(id, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const updateCreditsMutation = useMutation({
    mutationFn: ({ id, aiCredits }: { id: string; aiCredits: number }) =>
      updateAdminUserCredits(id, aiCredits),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteUser = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action is irreversible."
      )
    )
      return;

    try {
      await deleteUserMutation.mutateAsync(id);

      setUsers(users.filter((u) => u.id !== id));
      toast("User deleted successfully", "success");
    } catch (error) {
      toast("Failed to delete user", "error");
    }
  };

  const toggleRole = async (user: User) => {
    const newRole: User["role"] = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (
      !confirm(
        `Are you sure you want to change ${user.username}'s role to ${newRole}?`
      )
    )
      return;

    try {
      await updateRoleMutation.mutateAsync({
        id: user.id,
        role: newRole as "USER" | "ADMIN",
      });

      setUsers(
        users.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      toast(`User role updated to ${newRole}`, "success");
    } catch (error) {
      toast("Failed to update role", "error");
    }
  };

  const openCreditsModal = (user: User) => {
    setSelectedUser(user);
    setCreditInput(50);
    setIsAdding(true);
  };

  const handleSaveCredits = async () => {
    if (!selectedUser) return;

    const newCredits = isAdding
      ? Math.max(0, selectedUser.aiCredits + creditInput)
      : Math.max(0, creditInput);

    try {
      await updateCreditsMutation.mutateAsync({
        id: selectedUser.id,
        aiCredits: newCredits,
      });

      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, aiCredits: newCredits } : u
        )
      );

      toast(
        `Updated ${selectedUser.username}'s credits to ${newCredits}`,
        "success"
      );
      setSelectedUser(null);
    } catch (error) {
      toast("Failed to update user credits", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg)]/40" />
        <input
          type="text"
          placeholder="Search by username or email..."
          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] py-2 pl-10 pr-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">
        <table className="w-full text-left text-lg">
          <thead className="bg-[var(--bg)]/50 text-[var(--fg)]/60 font-medium">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">AI Credits</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="transition-colors hover:bg-[var(--bg)]/30"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/10 text-primary-500 font-bold">
                      {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--fg)]">
                        {user.username}
                      </p>
                      <p className="text-sm text-[var(--fg)]/40">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${
                      user.role === "ADMIN"
                        ? "bg-purple-500/10 text-purple-500"
                        : "bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    {user.role === "ADMIN" ? (
                      <ShieldCheck className="h-3 w-3" />
                    ) : (
                      <Users className="h-3 w-3" />
                    )}
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => openCreditsModal(user)}
                    className="group inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-600 dark:text-amber-400 transition-all hover:bg-amber-500/20 active:scale-95"
                    title="Click to manage AI Credits"
                  >
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span>{user.aiCredits}</span>
                    <Plus className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${
                      user.isDeleted
                        ? "bg-red-500/10 text-red-500"
                        : "bg-green-500/10 text-green-500"
                    }`}
                  >
                    {user.isDeleted ? "Deleted" : "Active"}
                  </span>
                </td>
                <td className="px-6 py-4 text-[var(--fg)]/60">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openCreditsModal(user)}
                      className="p-2 text-[var(--fg)]/40 hover:text-amber-500 transition-colors"
                      title="Grant / Edit AI Credits"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleRole(user)}
                      className="p-2 text-[var(--fg)]/40 hover:text-primary-500 transition-colors"
                      title={
                        user.role === "ADMIN"
                          ? "Demote to User"
                          : "Promote to Admin"
                      }
                    >
                      {user.role === "ADMIN" ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      className="p-2 text-[var(--fg)]/40 hover:text-blue-500 transition-colors"
                      title="Send Email"
                      onClick={() =>
                        (window.location.href = `mailto:${user.email}`)
                      }
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-[var(--fg)]/40 hover:text-red-500 transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[var(--fg)]/40">
              No users found matching your search.
            </p>
          </div>
        )}
      </div>

      {/* Grant AI Credits Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border-color)] bg-[var(--bg)] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 font-bold">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Grant AI Credits</h3>
                  <p className="text-sm text-[var(--fg)]/60">
                    {selectedUser.username} ({selectedUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-full p-2 text-[var(--fg)]/40 hover:bg-[var(--surface)] hover:text-[var(--fg)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Credits Badge */}
              <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)] p-4 border border-[var(--border-color)]">
                <span className="text-sm font-medium text-[var(--fg)]/70">
                  Current AI Credits:
                </span>
                <span className="text-2xl font-bold text-amber-500">
                  {selectedUser.aiCredits}
                </span>
              </div>

              {/* Mode Toggle */}
              <div className="flex rounded-xl bg-[var(--surface)] p-1 border border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
                    isAdding
                      ? "bg-primary-500 text-white shadow"
                      : "text-[var(--fg)]/60 hover:text-[var(--fg)]"
                  }`}
                >
                  Add Credits (+)
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
                    !isAdding
                      ? "bg-primary-500 text-white shadow"
                      : "text-[var(--fg)]/60 hover:text-[var(--fg)]"
                  }`}
                >
                  Set Total (=)
                </button>
              </div>

              {/* Presets if adding */}
              {isAdding && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-[var(--fg)]/50">
                    Quick Add Presets
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 50, 100, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCreditInput(amt)}
                        className={`rounded-xl border py-2 text-sm font-bold transition-all ${
                          creditInput === amt
                            ? "border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface)]/80"
                        }`}
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-[var(--fg)]/50">
                  {isAdding ? "Amount to Add" : "New Total Balance"}
                </label>
                <input
                  type="number"
                  min="0"
                  value={creditInput}
                  onChange={(e) => setCreditInput(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Summary Calculation */}
              <div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300 font-medium flex items-center justify-between">
                <span>Resulting Balance:</span>
                <span className="font-bold text-base">
                  {isAdding
                    ? Math.max(0, selectedUser.aiCredits + creditInput)
                    : Math.max(0, creditInput)}{" "}
                  Credits
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCredits}
                disabled={updateCreditsMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-95 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {updateCreditsMutation.isPending
                  ? "Updating..."
                  : "Save Credits"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
