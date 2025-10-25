import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileModal({
  open,
  onOpenChange,
}: ProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(
    user?.displayName || user?.username || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setError("Display name cannot be empty");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess(false);
      await updateProfile(displayName.trim());
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.[0]?.toUpperCase() || "?";
  };

  const getColorFromName = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-orange-500",
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setError("");
          setSuccess(false);
          setDisplayName(user?.displayName || user?.username || "");
        }
      }}
    >
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Customize how you appear to others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24">
              {user?.avatar ? (
                <AvatarImage
                  src={user.avatar}
                  alt={user.displayName || user.username}
                />
              ) : null}
              <AvatarFallback
                className={`${getColorFromName(user?.username || "")} text-3xl`}
              >
                {getInitials(user?.displayName || user?.username || "")}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-xs text-neutral-400">
                Username (cannot be changed)
              </p>
              <p className="text-sm font-mono text-neutral-300">
                @{user?.username}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-3 py-2 rounded-md text-sm">
              Profile updated successfully!
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="bg-neutral-800 border-neutral-700 text-white"
              maxLength={50}
            />
            <p className="text-xs text-neutral-500">
              This is how you'll appear to others in chat
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-neutral-800 border-neutral-700 hover:bg-neutral-700"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !displayName.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
