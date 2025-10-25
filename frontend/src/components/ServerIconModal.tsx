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
import { Label } from "./ui/label";

interface ServerIconModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  currentIcon: string;
  serverName: string;
}

export default function ServerIconModal({
  open,
  onOpenChange,
  serverId,
  currentIcon,
  serverName,
}: ServerIconModalProps) {
  const { updateServerIcon } = useServer();
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emojis = [
    "📚",
    "🎓",
    "📖",
    "✏️",
    "🔬",
    "🧪",
    "💻",
    "🎨",
    "🎵",
    "⚡",
    "🎮",
    "🏀",
    "⚽",
    "🎯",
    "🎪",
    "🎭",
    "🌟",
    "🔥",
    "💎",
    "🚀",
    "🌈",
    "☀️",
    "🌙",
    "⭐",
  ];

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      await updateServerIcon(serverId, selectedIcon);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setError("");
          setSelectedIcon(currentIcon);
        }
      }}
    >
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Change Server Icon</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Choose a new icon for {serverName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Select Icon</Label>
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedIcon(emoji)}
                  className={`h-12 w-12 text-2xl rounded-lg transition-all flex items-center justify-center ${
                    selectedIcon === emoji
                      ? "bg-blue-600 scale-110 ring-2 ring-blue-400"
                      : "bg-neutral-800 hover:bg-neutral-700 hover:scale-105"
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
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
              disabled={loading || selectedIcon === currentIcon}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Saving..." : "Save Icon"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
