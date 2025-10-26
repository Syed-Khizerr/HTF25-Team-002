import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_URL } from "@/config";

interface MuteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  userId: string;
  username: string;
  onMuteSuccess: () => void;
}

export default function MuteUserDialog({
  open,
  onOpenChange,
  serverId,
  userId,
  username,
  onMuteSuccess,
}: MuteUserDialogProps) {
  const [duration, setDuration] = useState<number>(5);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const presetDurations = [
    { label: "5 minutes", value: 5 },
    { label: "15 minutes", value: 15 },
    { label: "30 minutes", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "2 hours", value: 120 },
    { label: "6 hours", value: 360 },
    { label: "12 hours", value: 720 },
    { label: "24 hours", value: 1440 },
  ];

  const handleMute = async () => {
    if (!duration || duration <= 0) {
      alert("Please enter a valid duration");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/servers/${serverId}/mute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          duration,
          reason: reason.trim() || "No reason provided",
        }),
      });

      if (response.ok) {
        onMuteSuccess();
        onOpenChange(false);
        setDuration(5);
        setReason("");
        setSelectedPreset(null);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to mute user");
      }
    } catch (error) {
      console.error("Error muting user:", error);
      alert("Failed to mute user");
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (value: number, index: number) => {
    setDuration(value);
    setSelectedPreset(index);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔇 Mute User
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Temporarily prevent @{username} from sending messages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset Durations */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-neutral-300">
              Quick Select Duration
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {presetDurations.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => selectPreset(preset.value, index)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPreset === index
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Duration */}
          <div className="space-y-2">
            <Label
              htmlFor="duration"
              className="text-sm font-medium text-neutral-300"
            >
              Custom Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => {
                setDuration(parseInt(e.target.value) || 0);
                setSelectedPreset(null);
              }}
              className="bg-neutral-800 border-neutral-700 text-white"
              placeholder="Enter duration in minutes"
            />
            <p className="text-xs text-neutral-500">
              User will be muted for {duration} minute{duration !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label
              htmlFor="reason"
              className="text-sm font-medium text-neutral-300"
            >
              Reason (optional)
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-neutral-800 border-neutral-700 text-white"
              placeholder="Spam, inappropriate content, etc."
              maxLength={100}
            />
          </div>

          {/* Warning */}
          <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-3">
            <p className="text-xs text-amber-300">
              ⚠️ <strong>Note:</strong> @{username} will not be able to send
              messages in any channel of this server until the mute expires.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              setDuration(5);
              setReason("");
              setSelectedPreset(null);
            }}
            className="hover:bg-neutral-800"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMute}
            disabled={loading || !duration || duration <= 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Muting..." : "Mute User"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
