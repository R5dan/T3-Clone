"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { CompactModelSelector } from "~/components/ui/compact-model-selector";
import type { MODEL_IDS } from "~/server/chat/types";
import { useRouter } from "next/navigation";

export default function UserSettingsPage() {
  const { user, loading } = useAuth();
  const convexUser = useQuery(api.utils.getUserFromWorkOS, {
    userId: user?.id ?? null,
  });
  const allUsers = useQuery(api.utils.getAllUsers, {});
  const updateUserSettings = useMutation(api.utils.updateUserSettings);

  // Local state for form fields
  const [openRouterKey, setOpenRouterKey] = useState<string>("");
  const [defaultModel, setDefaultModel] = useState<MODEL_IDS | null>(null);
  const [friends, setFriends] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize state from convexUser
  useMemo(() => {
    if (convexUser) {
      setOpenRouterKey(convexUser.openRouterKey ?? "");
      setDefaultModel(convexUser.defaultModel as MODEL_IDS);
      setFriends(convexUser.friends);
    }
  }, [convexUser]);

  const router = useRouter();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!convexUser || !user) {
    return router.push("/auth/login?url=/auth/user/settings");
  }

  // Filter all users for friend selection (exclude self)
  const userList = Array.isArray(allUsers)
    ? allUsers.filter((u) => u.id !== convexUser.id)
    : [];

  const handleSave = async () => {
    setSaving(true);
    await updateUserSettings({
      userId: convexUser._id,
      openRouterKey,
      defaultModel,
      friends,
    });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="mx-auto py-8">
      <div className="flex flex-row justify-between">
        <div></div>
        <h1 className="mb-6 text-center text-2xl font-bold">User Settings</h1>
        <div>
          <Button onClick={handleSave} disabled={saving} className="mx-12">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          {success && (
            <div className="mt-2 text-green-600">Settings saved!</div>
          )}
        </div>
      </div>
      <div className="flex flex-row justify-center gap-4">
        <div>
          <Card className="mb-6 p-6">
            <h2 className="mb-2 text-lg font-semibold">OpenRouter Key</h2>
            <Input
              type="text"
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
              placeholder="Enter your OpenRouter API key"
              className="w-[300px]"
            />
          </Card>
          <Card className="mb-6 p-6">
            <h2 className="mb-2 text-lg font-semibold">Friends</h2>
            <div className="space-y-2">
              {userList.length === 0 && <div>No other users found.</div>}
              {userList.map((u) => (
                <label key={u.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={friends.includes(u._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFriends([...friends, u._id]);
                      } else {
                        setFriends(friends.filter((id) => id !== u._id));
                      }
                    }}
                  />
                  <span>{u.email}</span>
                </label>
              ))}
            </div>
          </Card>
        </div>
        <Card className="mb-6 p-6">
          <h2 className="mb-2 text-lg font-semibold">Default Model</h2>
          <div>
            <CompactModelSelector
              selectedModel={defaultModel ?? "openrouter/auto"}
              onModelSelect={setDefaultModel}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
