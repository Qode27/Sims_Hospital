import { useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "../api/services";
import { getErrorMessage } from "../api/client";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

export const ChangePasswordPage = () => {
  const { user, refreshMe, applySessionToken } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setSaving(true);
    try {
      const res = await authApi.changePassword({ oldPassword, newPassword });
      if (res.data.token) {
        applySessionToken(res.data.token);
      }
      await refreshMe();
      toast.success("Password updated. Continue to dashboard.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-panel">
        <h1 className="text-2xl font-semibold text-slate-800">Update Password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hello {user?.name}, you must change your password before using SIMS Hospital.
        </p>

        <div className="mt-5 space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <p className="mt-4 text-xs text-slate-500">Password must have uppercase, lowercase, number, special character, and be at least 10 characters long.</p>

        <Button type="submit" className="mt-5 w-full" disabled={saving}>
          {saving ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  );
};
