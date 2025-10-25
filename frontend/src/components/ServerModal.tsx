import { useState } from "react";
import { useServer } from "../contexts/ServerContext";
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
import { Plus, LogIn } from "lucide-react";

interface ServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ServerModal({ open, onOpenChange }: ServerModalProps) {
  const [mode, setMode] = useState<"choice" | "create" | "join">("choice");
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState("📚");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { createServer, joinServer } = useServer();

  const resetForm = () => {
    setMode("choice");
    setServerName("");
    setServerIcon("📚");
    setInviteCode("");
    setError("");
  };

  const handleCreate = async () => {
    if (!serverName.trim()) {
      setError("Server name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await createServer(serverName.trim(), serverIcon);
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError("Invite code is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await joinServer(inviteCode.trim());
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const emojis = ["📚", "🎓", "📖", "✏️", "🔬", "🧪", "💻", "🎨", "🎵", "⚡"];

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
        {mode === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle>Create or Join a Server</DialogTitle>
              <DialogDescription className="text-neutral-400">
                Start your study group or join an existing one
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Button
                className="w-full h-20 bg-neutral-800 hover:bg-neutral-700 border-2 border-neutral-700 hover:border-blue-500 transition-all"
                onClick={() => setMode("create")}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Create a Server</div>
                    <div className="text-sm text-neutral-400">
                      Set up your own study group
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                className="w-full h-20 bg-neutral-800 hover:bg-neutral-700 border-2 border-neutral-700 hover:border-green-500 transition-all"
                onClick={() => setMode("join")}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
                    <LogIn className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Join a Server</div>
                    <div className="text-sm text-neutral-400">
                      Enter an invite code
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <DialogHeader>
              <DialogTitle>Create Your Server</DialogTitle>
              <DialogDescription className="text-neutral-400">
                Give your server a personality with a name and icon
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label>Server Icon</Label>
                <div className="grid grid-cols-5 gap-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setServerIcon(emoji)}
                      className={`h-12 w-12 text-2xl rounded-lg transition-all ${
                        serverIcon === emoji
                          ? "bg-blue-600 scale-110"
                          : "bg-neutral-800 hover:bg-neutral-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serverName">Server Name</Label>
                <Input
                  id="serverName"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="My Study Group"
                  className="bg-neutral-800 border-neutral-700 text-white"
                  maxLength={100}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setMode("choice")}
                  className="flex-1 bg-neutral-800 border-neutral-700 hover:bg-neutral-700"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Creating..." : "Create Server"}
                </Button>
              </div>
            </div>
          </>
        )}

        {mode === "join" && (
          <>
            <DialogHeader>
              <DialogTitle>Join a Server</DialogTitle>
              <DialogDescription className="text-neutral-400">
                Enter an invite code to join an existing server
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  className="bg-neutral-800 border-neutral-700 text-white font-mono text-lg tracking-wider"
                  maxLength={8}
                />
                <p className="text-xs text-neutral-500">
                  Invite codes are usually 8 characters
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setMode("choice")}
                  className="flex-1 bg-neutral-800 border-neutral-700 hover:bg-neutral-700"
                >
                  Back
                </Button>
                <Button
                  onClick={handleJoin}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Joining..." : "Join Server"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
