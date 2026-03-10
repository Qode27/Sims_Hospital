import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../api/client";
import { userApi } from "../../api/services";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { Select } from "../../components/ui/Select";
import { formatDateTime } from "../../utils/format";

export const AdminUsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    role: "RECEPTION",
    password: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await userApi.list();
      setUsers(res.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await userApi.create(form);
      toast.success("User created");
      setForm({ name: "", username: "", role: "RECEPTION", password: "" });
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: any) => {
    try {
      await userApi.update(user.id, { active: !user.active });
      toast.success(`User ${user.active ? "disabled" : "enabled"}`);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const resetPassword = async (user: any) => {
    const password = prompt(`Set new password for ${user.username}`);
    if (!password) return;

    try {
      await userApi.resetPassword(user.id, password);
      toast.success("Password reset done. User must change it at next login.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-sm text-slate-500">Create and control staff accounts and access.</p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Create New User</h2>
        <form onSubmit={createUser} className="grid gap-3 md:grid-cols-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Username"
            value={form.username}
            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            required
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          >
            <option value="RECEPTION">Reception/Billing</option>
            <option value="DOCTOR">Doctor</option>
            <option value="ADMIN">Admin</option>
          </Select>
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
          <div className="md:col-span-4">
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create User"}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Users</h2>
        {loading ? (
          <Loader />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Name</th>
                  <th className="py-2">Username</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Active</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="py-3">{user.name}</td>
                    <td className="py-3">{user.username}</td>
                    <td className="py-3">{user.role}</td>
                    <td className="py-3">{user.active ? "Yes" : "No"}</td>
                    <td className="py-3">{formatDateTime(user.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button variant="secondary" className="h-8 px-3 py-1 text-xs" onClick={() => toggleActive(user)}>
                          {user.active ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="ghost" className="h-8 px-3 py-1 text-xs" onClick={() => resetPassword(user)}>
                          Reset Password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
