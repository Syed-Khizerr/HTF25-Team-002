import { useEffect, useState } from "react";
import { socket } from "@/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Hash,
  Send,
  Users,
  LogOut,
  Plus,
  UserPlus,
  Copy,
  Check,
  Reply,
  Smile,
  X,
  Paperclip,
  FileText,
  File,
  Image as ImageIcon,
  Trash2,
  MoreHorizontal,
  Pin,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useServer } from "@/contexts/ServerContext";
import ServerModal from "@/components/ServerModal";
import ProfileModal from "@/components/ProfileModal";
import ServerIconModal from "@/components/ServerIconModal";
import "../Index.css";

type Message = {
  _id: string;
  room: string;
  username: string;
  displayName?: string;
  avatar?: string;
  text: string;
  createdAt: string;
  mentions?: string[];
  replyTo?: string;
  replyToMessage?: {
    _id: string;
    username: string;
    displayName?: string;
    text: string;
    avatar?: string;
  };
  attachments?: Array<{
    url: string;
    filename: string;
    mimetype: string;
    size: number;
  }>;
  reactions?: Record<string, string[]>; // { emoji: [usernames] }
  pinned?: boolean;
};

type UserPresence = {
  username: string;
  displayName: string;
  avatar?: string;
};

export default function Home() {
  const { user, logout } = useAuth();
  const { servers, currentServer, channels, setCurrentServer } = useServer();
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [serverMembers, setServerMembers] = useState<UserPresence[]>([]);
  const [showServerModal, setShowServerModal] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showServerIconModal, setShowServerIconModal] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId
  const [mentionSuggestions, setMentionSuggestions] = useState<UserPresence[]>(
    []
  );
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null); // messageId
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    x: number;
    y: number;
  } | null>(null);

  const username = user?.username || "Guest";

  // Get pinned messages
  const pinnedMessages = messages.filter((m) => m.pinned);

  // Filter messages based on search query
  const filteredMessages = searchQuery.trim()
    ? messages.filter(
        (m) =>
          m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Close dropdown menu and context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMoreMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest(".more-menu-container")) {
          setShowMoreMenu(null);
        }
      }
      if (contextMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest(".context-menu-container")) {
          setContextMenu(null);
        }
      }
    };

    if (showMoreMenu || contextMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMoreMenu, contextMenu]);

  // Auto-select first channel when server changes
  useEffect(() => {
    if (channels.length > 0) {
      setCurrentRoom(channels[0].name);
    } else {
      setCurrentRoom(null);
      setMessages([]);
      setPresence([]);
    }
  }, [channels]);

  // Join server room when current server changes
  useEffect(() => {
    if (!currentServer || !username) return;

    // Clear messages when switching servers
    setMessages([]);
    setPresence([]);

    socket.emit("joinServer", {
      serverId: currentServer._id,
      username,
      userId: user?.id,
      displayName: user?.displayName || username,
      avatar: user?.avatar,
    });

    return () => {
      // Clean up when leaving server
      if (currentRoom) {
        socket.emit("leaveRoom", {
          room: currentRoom,
          serverId: currentServer._id,
        });
      }
    };
  }, [currentServer, username, currentRoom]);

  // Fetch server members when server changes
  useEffect(() => {
    if (!currentServer) {
      setServerMembers([]);
      return;
    }

    const fetchServerMembers = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("Fetching members for server:", currentServer._id);
        const response = await fetch(
          `http://localhost:5000/api/servers/${currentServer._id}/members`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Server members response status:", response.status);
        if (response.ok) {
          const members = await response.json();
          console.log("Fetched server members:", members);
          setServerMembers(members);
        } else {
          const errorText = await response.text();
          console.error(
            "Failed to fetch server members:",
            response.status,
            errorText
          );
        }
      } catch (error) {
        console.error("Error fetching server members:", error);
      }
    };

    fetchServerMembers();
  }, [currentServer]);

  // Update presence when user profile changes (displayName or avatar)
  useEffect(() => {
    if (!currentServer || !currentRoom || !username) return;

    // Re-join room with updated user info to refresh presence
    socket.emit("updatePresence", {
      room: currentRoom,
      serverId: currentServer._id,
      username,
      displayName: user?.displayName || username,
      avatar: user?.avatar,
    });
  }, [user?.displayName, user?.avatar]);

  // Join room and fetch messages when current room changes
  useEffect(() => {
    if (!currentRoom || !username || !currentServer) return;

    socket.emit("joinRoom", {
      room: currentRoom,
      username,
      serverId: currentServer._id,
      displayName: user?.displayName || username,
      avatar: user?.avatar,
    });

    fetch(
      `http://localhost:5000/rooms/${currentRoom}/messages?serverId=${currentServer._id}`
    )
      .then((r) => r.json())
      .then((data) => setMessages(data))
      .catch((err) => {
        console.error("Failed to fetch messages:", err);
        setMessages([]);
      });

    return () => {
      socket.emit("leaveRoom", {
        room: currentRoom,
        serverId: currentServer._id,
      });
    };
  }, [currentRoom, username, currentServer]);

  // Socket event listeners for room-specific events (messages)
  useEffect(() => {
    function onLoad(last: Message[]) {
      setMessages(last);
    }
    function onNew(msg: Message) {
      setMessages((m) => [...m, msg]);
    }
    function onUpdate(msg: Message) {
      setMessages((m) => m.map((x) => (x._id === msg._id ? msg : x)));
    }
    function onDeleted({ messageId }: { messageId: string }) {
      setMessages((m) => m.filter((x) => x._id !== messageId));
    }

    socket.on("loadMessages", onLoad);
    socket.on("newMessage", onNew);
    socket.on("updateMessage", onUpdate);
    socket.on("deletedMessage", onDeleted);

    return () => {
      socket.off("loadMessages", onLoad);
      socket.off("newMessage", onNew);
      socket.off("updateMessage", onUpdate);
      socket.off("deletedMessage", onDeleted);
    };
  }, [currentRoom]);

  // Socket event listener for server-wide presence (independent of room changes)
  useEffect(() => {
    function onPresence({ users }: { users: UserPresence[] }) {
      // Only update if the user list has actually changed
      setPresence((currentPresence) => {
        // Check if the users are the same
        if (currentPresence.length !== users.length) {
          return users;
        }

        // Compare usernames to see if the list has changed
        const currentUsernames = new Set(
          currentPresence.map((u) => u.username)
        );
        const newUsernames = new Set(users.map((u) => u.username));

        // Check if same users
        if (currentUsernames.size !== newUsernames.size) {
          return users;
        }

        for (const username of newUsernames) {
          if (!currentUsernames.has(username)) {
            return users;
          }
        }

        // No change, return current state to avoid re-render
        return currentPresence;
      });
    }

    socket.on("presence", onPresence);

    return () => {
      socket.off("presence", onPresence);
    };
  }, []); // No dependencies - only set up once

  const sendMessage = async () => {
    if (!currentRoom || !currentServer) return;
    if (!text.trim() && uploadingFiles.length === 0) return;

    try {
      let attachments: any[] = [];

      // Upload files if any
      if (uploadingFiles.length > 0) {
        setUploading(true);
        const token = localStorage.getItem("token");

        for (const file of uploadingFiles) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("http://localhost:5000/api/upload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (response.ok) {
            const fileInfo = await response.json();
            attachments.push(fileInfo);
          } else {
            console.error("Failed to upload file:", file.name);
          }
        }
        setUploading(false);
      }

      socket.emit("sendMessage", {
        room: currentRoom,
        username,
        text: text.trim(),
        serverId: currentServer._id,
        displayName: user?.displayName || username,
        avatar: user?.avatar,
        replyTo: replyingTo?._id || null,
        attachments,
      });

      setText("");
      setReplyingTo(null);
      setUploadingFiles([]);
    } catch (error) {
      console.error("Error sending message:", error);
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadingFiles((prev) => [...prev, ...files]);
    }
    // Reset input
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (mimetype === "application/pdf") return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!currentRoom || !currentServer) return;
    socket.emit("reactMessage", {
      messageId,
      emoji,
      username,
      room: currentRoom,
      serverId: currentServer._id,
    });
    setShowEmojiPicker(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!currentRoom || !currentServer) return;
    if (confirm("Are you sure you want to delete this message?")) {
      socket.emit("deleteMessage", {
        messageId,
        room: currentRoom,
        serverId: currentServer._id,
        username,
      });
    }
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowInputEmojiPicker(false);
  };

  const handlePinMessage = (messageId: string) => {
    if (!currentRoom || !currentServer) return;
    socket.emit("pinMessage", {
      messageId,
      room: currentRoom,
      serverId: currentServer._id,
    });
    setShowMoreMenu(null);
  };

  const handleCopyMessageLink = (messageId: string) => {
    const link = `${window.location.origin}${window.location.pathname}?message=${messageId}`;
    navigator.clipboard.writeText(link);
    setShowMoreMenu(null);
  };

  const renderMessageText = (msg: Message) => {
    const parts = msg.text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const mentionedUsername = part.substring(1);
        const isCurrentUser = mentionedUsername === username;
        const userExists =
          serverMembers.some((user) => user.username === mentionedUsername) ||
          presence.some((user) => user.username === mentionedUsername);

        // Only highlight if user exists in the server
        if (!userExists) {
          return <span key={i}>{part}</span>;
        }

        return (
          <span
            key={i}
            className={`font-semibold ${
              isCurrentUser
                ? "bg-blue-500/30 text-blue-300 px-1 rounded"
                : "text-blue-400 hover:underline cursor-pointer"
            }`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);

    // Check for mention trigger
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      // Only show suggestions if @ is at start or after space, and no space after @
      const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : " ";
      if (
        (charBeforeAt === " " || lastAtIndex === 0) &&
        !textAfterAt.includes(" ")
      ) {
        // Combine serverMembers and presence, remove duplicates
        const allMembers = [...serverMembers];
        presence.forEach((p) => {
          if (!allMembers.find((m) => m.username === p.username)) {
            allMembers.push(p);
          }
        });

        console.log("All members for mentions:", allMembers);

        const filtered = allMembers.filter(
          (p) =>
            p.username.toLowerCase().includes(textAfterAt.toLowerCase()) ||
            p.displayName.toLowerCase().includes(textAfterAt.toLowerCase())
        );
        setMentionSuggestions(filtered);
      } else {
        setMentionSuggestions([]);
      }
    } else {
      setMentionSuggestions([]);
    }
  };

  const insertMention = (user: UserPresence) => {
    const lastAtIndex = text.lastIndexOf("@");
    const newText = text.slice(0, lastAtIndex) + `@${user.username} `;
    setText(newText);
    setMentionSuggestions([]);
  };

  // Function to render text with highlighted mentions
  const renderTextWithMentions = (inputText: string) => {
    // Match @username patterns (username can contain letters, numbers, underscores, hyphens)
    const mentionRegex = /@([\w-]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(inputText)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-white">
            {inputText.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Check if the mentioned user exists in the server
      const mentionedUsername = match[1]; // Get username without @
      const userExists =
        serverMembers.some((user) => user.username === mentionedUsername) ||
        presence.some((user) => user.username === mentionedUsername);

      // Add the mention (highlighted only if user exists)
      parts.push(
        <span
          key={`mention-${match.index}`}
          className={
            userExists
              ? "bg-blue-600/40 text-blue-400 px-1 rounded"
              : "text-white"
          }
        >
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < inputText.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="text-white">
          {inputText.slice(lastIndex)}
        </span>
      );
    }

    // If no mentions found, return the whole text in white
    if (parts.length === 0) {
      return <span className="text-white">{inputText}</span>;
    }

    return parts;
  };

  const copyInviteCode = async () => {
    if (!currentServer?.inviteCode) return;

    try {
      await navigator.clipboard.writeText(currentServer.inviteCode);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch (err) {
      console.error("Failed to copy invite code:", err);
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

  // Show modal if user has no servers
  if (servers.length === 0) {
    return (
      <div className="h-screen w-screen bg-neutral-800 flex items-center justify-center">
        <div className="bg-neutral-900 rounded-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to StudyRooms!
          </h2>
          <p className="text-neutral-400 mb-6">
            Create a server to start collaborating with others, or join an
            existing server with an invite code.
          </p>
          <Button
            onClick={() => setShowServerModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create or Join Server
          </Button>
        </div>
        <ServerModal open={showServerModal} onOpenChange={setShowServerModal} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-linear-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex">
      {/* Server Sidebar (Leftmost) */}
      <aside className="w-18 z-2 bg-black/40 backdrop-blur-sm border-r border-white/5 flex flex-col items-center py-3 gap-2 shadow-elevation-high">
        {servers.map((server) => (
          <button
            key={server._id}
            onClick={() => setCurrentServer(server)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (server.ownerId === user?.id) {
                setCurrentServer(server);
                setShowServerIconModal(true);
              }
            }}
            className={`relative group w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 hover:rounded-xl hover:scale-110 ${
              currentServer?._id === server._id
                ? "bg-linear-to-br from-blue-600 to-purple-600 rounded-xl shadow-glow scale-105"
                : "bg-neutral-700/80 hover:bg-neutral-600 shadow-elevation-low hover:shadow-elevation-medium"
            }`}
          >
            {server.icon}
            <span className="z-10 absolute left-full bottom-0 mb-2 ml-2 hidden group-hover:flex bg-linear-to-r from-blue-600 to-purple-600 text-white text-sm px-3 py-1.5 rounded-lg shadow-elevation-high whitespace-nowrap backdrop-blur-sm border border-white/10 animate-in fade-in slide-in-from-left-2">
              {server.ownerId === user?.id
                ? `${server.name} (Right-click to change icon)`
                : server.name}
            </span>
          </button>
        ))}

        <div className="divider-gradient w-8 my-2" />

        <button
          onClick={() => setShowServerModal(true)}
          className="relative group w-12 h-12 rounded-2xl bg-neutral-700/80 hover:bg-linear-to-br hover:from-green-600 hover:to-emerald-600 hover:rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-elevation-low hover:shadow-glow"
        >
          <Plus className="h-6 w-6 text-green-500 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
          <span className="absolute z-20 left-full bottom-0 mb-2 ml-2 hidden group-hover:flex bg-linear-to-r from-green-600 to-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg shadow-elevation-high whitespace-nowrap backdrop-blur-sm border border-white/10 animate-in fade-in slide-in-from-left-2">
            Add a Server
          </span>
        </button>
      </aside>

      {/* Channel Sidebar */}
      <aside className="pt-4 w-64 z-1 flex flex-col bg-neutral-900/95 backdrop-blur-md border-r border-white/5 text-white shadow-elevation-medium">
        <div className="position-relative px-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold bg-linear-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent transition-all duration-500 hover:pb-2 hover:scale-105 hover:cursor-pointer bg-size-[200%] hover:bg-right animate-in fade-in slide-in-from-left-3">
              {currentServer?.name || "StudyRooms"}
            </h1>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowInviteDialog(true)}
              className="relative group h-8 w-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800/70 hover:scale-110 transition-all duration-200 rounded-lg"
            >
              <UserPlus className="h-4 w-4" />
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:flex bg-linear-to-r from-blue-600 to-purple-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-elevation-high whitespace-nowrap z-50 backdrop-blur-sm border border-white/10 animate-in fade-in slide-in-from-right-2">
                Invite People
              </span>
            </Button>
          </div>
          <p className="text-xs mt-1 mb-5 text-neutral-400 font-medium">
            ✨ {currentServer?.members.length || 0} members
          </p>
          <div className="divider-gradient mb-4"></div>
        </div>

        <div className="flex-1 p-3 overflow-auto space-y-1">
          <div className="text-xs font-bold px-2 py-2 text-neutral-500 tracking-wider">
            TEXT CHANNELS
          </div>
          {channels.map((channel, index) => (
            <button
              key={channel._id}
              onClick={() => setCurrentRoom(channel.name)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative overflow-hidden ${
                currentRoom === channel.name
                  ? "bg-linear-to-r from-blue-600 to-purple-600 text-white font-medium shadow-elevation-medium scale-105"
                  : "text-neutral-400 hover:bg-neutral-800/70 hover:text-white hover:scale-102 hover:pl-4"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Hash className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="relative z-10">{channel.name}</span>
              {currentRoom === channel.name && (
                <div className="absolute inset-0 bg-linear-to-r from-blue-600/20 to-purple-600/20 blur-xl -z-10"></div>
              )}
            </button>
          ))}
        </div>

        <div className="p-3 bg-neutral-950/50 backdrop-blur-sm border-t border-white/5">
          <div
            className="relative flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-neutral-800/50 transition-all duration-200 group"
            onClick={() => setShowProfileModal(true)}
          >
            <div className="relative">
              <Avatar className="h-10 w-10 transition-all duration-200 group-hover:scale-110 ring-2 ring-transparent group-hover:ring-blue-600/50">
                {user?.avatar ? (
                  <AvatarImage
                    src={user.avatar}
                    alt={user.displayName || username}
                  />
                ) : null}
                <AvatarFallback
                  className={`${getColorFromName(username)} font-semibold`}
                >
                  {getInitials(user?.displayName || username)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-neutral-950 rounded-full online-indicator"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.displayName || username}
              </p>
              <p className="text-xs text-neutral-400 truncate">@{username}</p>
            </div>
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex bg-linear-to-r from-blue-600 to-purple-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-elevation-high whitespace-nowrap z-50 backdrop-blur-sm border border-white/10 animate-in fade-in slide-in-from-bottom-2">
              Click to edit profile
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="relative group/logout h-8 w-8 p-0 text-neutral-400 hover:text-white hover:bg-red-600/20 hover:scale-110 transition-all duration-200 rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }}
            >
              <LogOut className="h-4 w-4 group-hover/logout:rotate-12 transition-transform" />
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover/logout:flex bg-linear-to-r from-red-600 to-orange-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-elevation-high whitespace-nowrap z-50 backdrop-blur-sm border border-white/10 animate-in fade-in slide-in-from-right-2">
                Logout
              </span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Header */}
      <div className="flex-1 flex flex-col">
        {/* Header - spans full width */}
        <header className="h-16 border-b border-white/5 px-6 flex items-center gap-4 backdrop-blur-md bg-neutral-900/80 shadow-elevation-low">
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="p-2 bg-linear-to-br from-blue-600/20 to-purple-600/20 rounded-lg">
              <Hash className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="font-bold text-xl text-white tracking-tight">
              {currentRoom || "Select a channel"}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground ml-auto">
            {/* Pinned Messages Button */}
            <button
              onClick={() => setShowPinnedMessages(!showPinnedMessages)}
              className="relative group h-10 w-10 flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer rounded-lg hover:bg-amber-600/20"
            >
              <Pin className="h-5 w-5 text-amber-500 group-hover:text-amber-400 transition-colors" />
              {pinnedMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-linear-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-glow animate-in zoom-in">
                  {pinnedMessages.length}
                </span>
              )}
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex bg-linear-to-r from-amber-600 to-orange-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-elevation-high whitespace-nowrap z-50 backdrop-blur-sm border border-white/10 animate-in fade-in slide-in-from-top-2">
                {pinnedMessages.length > 0
                  ? `${pinnedMessages.length} Pinned Messages`
                  : "No Pinned Messages"}
              </span>
            </button>

            {/* Online Users Button */}
            <button
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className="relative group flex items-center gap-1.5 h-8 px-2 transition-transform hover:scale-110 cursor-pointer"
            >
              <Users className="h-4 w-4" />
              <span>{presence.length}</span>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex bg-linear-to-r from-blue-600 to-purple-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                {showRightSidebar ? "Hide Members" : "Show Members"}
              </span>
            </button>

            {/* Search Bar */}
            <div className="w-56">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-7 pl-8 pr-7 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 text-xs focus:ring-1 focus:ring-blue-600 rounded-md"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area - Messages and Right Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-800 ">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Hash className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    {searchQuery ? (
                      <>
                        <p className="text-sm">No messages found</p>
                        <p className="text-xs mt-1">
                          Try searching with different keywords
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">
                          Be the first to say something!
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                filteredMessages.map((m) => (
                  <div
                    key={m._id}
                    className="group flex gap-3 hover:bg-neutral-900/50 -mx-2 px-2 py-1 rounded-lg relative"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        messageId: m._id,
                        x: e.clientX,
                        y: e.clientY,
                      });
                      setShowMoreMenu(null); // Close the more menu if open
                      setShowEmojiPicker(null); // Close emoji picker if open
                    }}
                  >
                    <Avatar className="h-10 w-10 mt-0.5">
                      {m.avatar ? (
                        <AvatarImage
                          src={m.avatar}
                          alt={m.displayName || m.username}
                        />
                      ) : null}
                      <AvatarFallback
                        className={getColorFromName(
                          m.displayName || m.username
                        )}
                      >
                        {getInitials(m.displayName || m.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      {/* Reply preview */}
                      {m.replyToMessage && (
                        <div className="flex items-start gap-2 mb-1 text-xs text-neutral-400 bg-neutral-900/30 rounded px-2 py-1 border-l-2 border-neutral-600">
                          <Reply className="h-3 w-3 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold">
                              {m.replyToMessage.displayName ||
                                m.replyToMessage.username}
                            </span>
                            <p className="truncate text-neutral-500">
                              {m.replyToMessage.text}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-md text-white">
                          {m.displayName || m.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {m.pinned && (
                          <span className="flex items-center gap-1 text-xs text-amber-400">
                            <Pin className="h-3 w-3" />
                            Pinned
                          </span>
                        )}
                      </div>
                      {m.text && (
                        <p className="text-sm text-white mt-1 wrap-break-word">
                          {renderMessageText(m)}
                        </p>
                      )}

                      {/* File attachments */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {m.attachments.map((file, i) => (
                            <div key={i}>
                              {file.mimetype.startsWith("image/") ? (
                                <a
                                  href={`http://localhost:5000${file.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={`http://localhost:5000${file.url}`}
                                    alt={file.filename}
                                    className="max-w-sm max-h-96 rounded-lg border border-neutral-700 hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={`http://localhost:5000${file.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors max-w-sm"
                                >
                                  {getFileIcon(file.mimetype)}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                      {file.filename}
                                    </p>
                                    <p className="text-xs text-neutral-400">
                                      {formatFileSize(file.size)}
                                    </p>
                                  </div>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reactions */}
                      {m.reactions && Object.keys(m.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(m.reactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(m._id, emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                users.includes(username)
                                  ? "bg-blue-500/20 border border-blue-500/50 text-blue-300"
                                  : "bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300"
                              }`}
                              title={users.join(", ")}
                            >
                              <span>{emoji}</span>
                              <span className="text-xs">{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Message actions (show on hover) */}
                    <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg px-1 py-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setShowEmojiPicker(
                            showEmojiPicker === m._id ? null : m._id
                          )
                        }
                        className="h-7 w-7 p-0 hover:bg-neutral-700 rounded"
                        title="Add Reaction"
                      >
                        <Smile className="h-4 w-4 text-neutral-400" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyingTo(m)}
                        className="h-7 w-7 p-0 hover:bg-neutral-700 rounded"
                        title="Reply"
                      >
                        <Reply className="h-4 w-4 text-neutral-400" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setShowMoreMenu(showMoreMenu === m._id ? null : m._id)
                        }
                        className="h-7 w-7 p-0 hover:bg-neutral-700 rounded more-menu-container"
                        title="More"
                      >
                        <MoreHorizontal className="h-4 w-4 text-neutral-400" />
                      </Button>
                    </div>

                    {/* More options menu */}
                    {showMoreMenu === m._id && (
                      <div className="absolute top-6 right-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-1 min-w-[180px] z-20 more-menu-container">
                        <button
                          onClick={() => handlePinMessage(m._id)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-800 transition-colors text-left"
                        >
                          <Pin className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm text-white">
                            {m.pinned ? "Unpin Message" : "Pin Message"}
                          </span>
                        </button>
                        <button
                          onClick={() => handleCopyMessageLink(m._id)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-800 transition-colors text-left"
                        >
                          <Copy className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm text-white">
                            Copy Message Link
                          </span>
                        </button>
                        <div className="h-px bg-neutral-700 my-1" />
                        <button
                          onClick={() => handleDeleteMessage(m._id)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-600/20 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={m.username !== username}
                          title={
                            m.username !== username
                              ? "Only message owner can delete"
                              : "Delete message"
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                          <span className="text-sm text-red-400">
                            Delete Message
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Emoji picker */}
                    {showEmojiPicker === m._id && (
                      <div className="absolute top-8 right-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl p-2 grid grid-cols-6 gap-1 z-10">
                        {[
                          "👍",
                          "❤️",
                          "😂",
                          "😮",
                          "😢",
                          "😡",
                          "🔥",
                          "✨",
                          "🎉",
                          "👀",
                          "💯",
                          "🚀",
                        ].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(m._id, emoji)}
                            className="text-xl hover:bg-neutral-700 rounded p-1 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
              <div
                className="fixed bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-1 min-w-[200px] z-50 context-menu-container"
                style={{
                  left: `${contextMenu.x}px`,
                  top: `${contextMenu.y}px`,
                }}
              >
                <button
                  onClick={() => {
                    const message = messages.find(
                      (m) => m._id === contextMenu.messageId
                    );
                    if (message) {
                      setReplyingTo(message);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-800 transition-colors text-left"
                >
                  <Reply className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-white">Reply</span>
                </button>

                <button
                  onClick={() => {
                    setShowEmojiPicker(contextMenu.messageId);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-800 transition-colors text-left"
                >
                  <Smile className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-white">Add Reaction</span>
                </button>

                <div className="h-px bg-neutral-700 my-1" />

                <button
                  onClick={() => {
                    handlePinMessage(contextMenu.messageId);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-800 transition-colors text-left"
                >
                  <Pin className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-white">
                    {messages.find((m) => m._id === contextMenu.messageId)
                      ?.pinned
                      ? "Unpin Message"
                      : "Pin Message"}
                  </span>
                </button>

                <button
                  onClick={() => {
                    handleCopyMessageLink(contextMenu.messageId);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-800 transition-colors text-left"
                >
                  <Copy className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-white">Copy Message Link</span>
                </button>

                <div className="h-px bg-neutral-700 my-1" />

                <button
                  onClick={() => {
                    handleDeleteMessage(contextMenu.messageId);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-600/20 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    messages.find((m) => m._id === contextMenu.messageId)
                      ?.username !== username
                  }
                  title={
                    messages.find((m) => m._id === contextMenu.messageId)
                      ?.username !== username
                      ? "Only message owner can delete"
                      : "Delete message"
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-400">Delete Message</span>
                </button>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 mx-2 rounded-lg bg-neutral-700 relative">
              {/* Mention suggestions */}
              {mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {mentionSuggestions.map((user, i) => (
                    <button
                      key={`${user.username}-${i}`}
                      onClick={() => insertMention(user)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-700 transition-colors text-left"
                    >
                      <Avatar className="h-6 w-6">
                        {user.avatar ? (
                          <AvatarImage
                            src={user.avatar}
                            alt={user.displayName}
                          />
                        ) : null}
                        <AvatarFallback
                          className={getColorFromName(user.displayName)}
                        >
                          {getInitials(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-neutral-400">
                          @{user.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Reply preview in input */}
              {replyingTo && (
                <div className="mb-2 flex items-start gap-2 bg-neutral-800 rounded px-3 py-2 border-l-2 border-blue-500">
                  <Reply className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-400">
                      Replying to{" "}
                      <span className="font-semibold text-white">
                        {replyingTo.displayName || replyingTo.username}
                      </span>
                    </p>
                    <p className="text-sm text-neutral-300 truncate">
                      {replyingTo.text}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReplyingTo(null)}
                    className="h-6 w-6 p-0 hover:bg-neutral-700"
                  >
                    <X className="h-4 w-4 text-neutral-400" />
                  </Button>
                </div>
              )}

              {/* File upload preview */}
              {uploadingFiles.length > 0 && (
                <div className="mb-2 space-y-1">
                  {uploadingFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-neutral-800 rounded px-3 py-2"
                    >
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(i)}
                        className="h-6 w-6 p-0 hover:bg-neutral-700"
                      >
                        <X className="h-4 w-4 text-neutral-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Emoji picker for input */}
              {showInputEmojiPicker && (
                <div className="absolute bottom-full left-4 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl p-3 z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">
                      Emojis
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowInputEmojiPicker(false)}
                      className="h-6 w-6 p-0 hover:bg-neutral-700"
                    >
                      <X className="h-4 w-4 text-neutral-400" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
                    {[
                      "😀",
                      "😃",
                      "😄",
                      "😁",
                      "😆",
                      "😅",
                      "🤣",
                      "😂",
                      "🙂",
                      "🙃",
                      "😉",
                      "😊",
                      "😇",
                      "🥰",
                      "😍",
                      "🤩",
                      "😘",
                      "😗",
                      "😚",
                      "😙",
                      "😋",
                      "😛",
                      "😜",
                      "🤪",
                      "😝",
                      "🤑",
                      "🤗",
                      "🤭",
                      "🤫",
                      "🤔",
                      "🤐",
                      "🤨",
                      "😐",
                      "😑",
                      "😶",
                      "😏",
                      "😒",
                      "🙄",
                      "😬",
                      "🤥",
                      "😌",
                      "😔",
                      "😪",
                      "🤤",
                      "😴",
                      "😷",
                      "🤒",
                      "🤕",
                      "🤢",
                      "🤮",
                      "🤧",
                      "🥵",
                      "🥶",
                      "😵",
                      "🤯",
                      "🤠",
                      "🥳",
                      "😎",
                      "🤓",
                      "🧐",
                      "😕",
                      "😟",
                      "🙁",
                      "😮",
                      "😯",
                      "😲",
                      "😳",
                      "🥺",
                      "😦",
                      "😧",
                      "😨",
                      "😰",
                      "😥",
                      "😢",
                      "😭",
                      "😱",
                      "😖",
                      "😣",
                      "😞",
                      "😓",
                      "😩",
                      "😫",
                      "🥱",
                      "😤",
                      "😡",
                      "😠",
                      "🤬",
                      "😈",
                      "👿",
                      "💀",
                      "☠️",
                      "💩",
                      "🤡",
                      "👹",
                      "👺",
                      "👻",
                      "👽",
                      "👾",
                      "🤖",
                      "😺",
                      "😸",
                      "😹",
                      "😻",
                      "😼",
                      "😽",
                      "🙀",
                      "😿",
                      "😾",
                      "🙈",
                      "🙉",
                      "🙊",
                      "💋",
                      "💌",
                      "💘",
                      "💝",
                      "💖",
                      "💗",
                      "💓",
                      "💞",
                      "💕",
                      "💟",
                      "❣️",
                      "💔",
                      "❤️",
                      "🧡",
                      "💛",
                      "💚",
                      "💙",
                      "💜",
                      "🤎",
                      "🖤",
                      "🤍",
                      "💯",
                      "💢",
                      "💥",
                      "💫",
                      "💦",
                      "💨",
                      "🕳️",
                      "💣",
                      "💬",
                      "👁️",
                      "🗨️",
                      "🗯️",
                      "💭",
                      "💤",
                      "👋",
                      "🤚",
                      "🖐️",
                      "✋",
                      "🖖",
                      "👌",
                      "🤏",
                      "✌️",
                      "🤞",
                      "🤟",
                      "🤘",
                      "🤙",
                      "👈",
                      "👉",
                      "👆",
                      "🖕",
                      "👇",
                      "☝️",
                      "👍",
                      "👎",
                      "✊",
                      "👊",
                      "🤛",
                      "🤜",
                      "👏",
                      "🙌",
                      "👐",
                      "🤲",
                      "🤝",
                      "🙏",
                      "✍️",
                      "💅",
                      "🤳",
                      "💪",
                      "🦾",
                      "🦿",
                      "🦵",
                      "🦶",
                      "👂",
                      "🦻",
                      "👃",
                      "🧠",
                      "🦷",
                      "🦴",
                      "👀",
                      "👁️",
                      "👅",
                      "👄",
                      "💋",
                      "🩸",
                      "🔥",
                      "✨",
                      "🌟",
                      "💫",
                      "⭐",
                      "🌈",
                      "☀️",
                      "🌤️",
                      "⛅",
                      "🌥️",
                      "☁️",
                      "🌦️",
                      "🌧️",
                      "⛈️",
                      "🌩️",
                      "🌨️",
                      "❄️",
                      "☃️",
                      "⛄",
                      "🎉",
                      "🎊",
                      "🎈",
                      "🎁",
                      "🏆",
                      "🥇",
                      "🥈",
                      "🥉",
                      "⚽",
                      "🏀",
                      "🏈",
                      "⚾",
                      "🥎",
                      "🎾",
                      "🏐",
                      "🏉",
                      "🥏",
                      "🎱",
                      "🏓",
                      "🏸",
                      "🏒",
                      "🏑",
                      "🥍",
                      "🏏",
                      "⛳",
                      "🚀",
                      "🛸",
                      "🚁",
                      "✈️",
                      "🛩️",
                      "🚂",
                      "🚗",
                      "🚙",
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="text-2xl hover:bg-neutral-700 rounded p-1 transition-colors"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                  disabled={!currentRoom || uploading}
                  className="h-10 w-10 p-0 hover:bg-neutral-600"
                  title="Attach files"
                >
                  <Paperclip className="h-5 w-5 text-neutral-400" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowInputEmojiPicker(!showInputEmojiPicker)}
                  disabled={!currentRoom || uploading}
                  className="h-10 w-10 p-0 hover:bg-neutral-600"
                  title="Add emoji"
                >
                  <Smile className="h-5 w-5 text-neutral-400" />
                </Button>
                <div className="flex-1 flex flex-col gap-1">
                  {/* Preview span showing highlighted mentions */}
                  {text && (
                    <div className="px-3 py-1 bg-neutral-800/50 rounded text-sm">
                      {renderTextWithMentions(text)}
                    </div>
                  )}
                  {/* Normal input */}
                  <Input
                    value={text}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Tab" && mentionSuggestions.length > 0) {
                        e.preventDefault();
                        insertMention(mentionSuggestions[0]);
                      } else if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (mentionSuggestions.length > 0) {
                          insertMention(mentionSuggestions[0]);
                        } else {
                          sendMessage();
                        }
                      } else if (e.key === "Escape") {
                        if (mentionSuggestions.length > 0) {
                          setMentionSuggestions([]);
                        } else {
                          setReplyingTo(null);
                        }
                      }
                    }}
                    placeholder={
                      currentRoom
                        ? replyingTo
                          ? `Reply to ${
                              replyingTo.displayName || replyingTo.username
                            }...`
                          : `Message #${currentRoom}`
                        : "Select a channel first"
                    }
                    className="bg-neutral-700 selection:bg-blue-500 border-none text-white placeholder:text-neutral-500 active:outline-none focus:outline-none"
                    disabled={!currentRoom || uploading}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={
                    !currentRoom ||
                    (!text.trim() && uploadingFiles.length === 0) ||
                    uploading
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="text-xs">Uploading...</span>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </main>

          {/* Right Sidebar - Members */}
          {showRightSidebar && (
            <aside className="w-60 bg-neutral-900 border-l border-neutral-800 p-4">
              <div className="text-xs font-semibold text-neutral-400 mb-3">
                MEMBERS — {presence.length}
              </div>
              <div className="space-y-2">
                {presence.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-4">
                    No one else here yet
                  </p>
                ) : (
                  presence.map((p, i) => (
                    <div
                      key={`${p.username}-${i}`}
                      className="relative group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-800/50 transition-all cursor-pointer"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8 transition-transform group-hover:scale-110">
                          {p.avatar ? (
                            <AvatarImage src={p.avatar} alt={p.displayName} />
                          ) : null}
                          <AvatarFallback
                            className={getColorFromName(p.displayName)}
                          >
                            {getInitials(p.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-neutral-900 rounded-full" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">
                          {p.displayName}
                        </span>
                        <span className="text-xs text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          @{p.username}
                        </span>
                      </div>
                      <span className="absolute left-full ml-2 hidden group-hover:flex bg-linear-to-r from-green-600 to-emerald-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                        Online
                      </span>
                    </div>
                  ))
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      <ServerModal open={showServerModal} onOpenChange={setShowServerModal} />

      <ProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
      />

      {currentServer && (
        <ServerIconModal
          open={showServerIconModal}
          onOpenChange={setShowServerIconModal}
          serverId={currentServer._id}
          currentIcon={currentServer.icon}
          serverName={currentServer.name}
        />
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader>
            <DialogTitle>Invite People to {currentServer?.name}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Share this invite code with others to let them join your server
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Invite Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={currentServer?.inviteCode || ""}
                  readOnly
                  className="bg-neutral-800 border-neutral-700 text-white font-mono text-lg tracking-wider"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  onClick={copyInviteCode}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-400">
                💡 <strong>How to join:</strong> Click the{" "}
                <Plus className="inline h-3 w-3" /> button in the server list,
                select "Join a Server", and paste this code.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pinned Messages Dialog */}
      <Dialog open={showPinnedMessages} onOpenChange={setShowPinnedMessages}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pin className="h-5 w-5 text-amber-400" />
              Pinned Messages in #{currentRoom}
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              {pinnedMessages.length === 0
                ? "No pinned messages in this channel"
                : `${pinnedMessages.length} pinned ${
                    pinnedMessages.length === 1 ? "message" : "messages"
                  }`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-4">
            {pinnedMessages.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                <Pin className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No pinned messages yet</p>
                <p className="text-xs mt-1">
                  Pin important messages to find them easily
                </p>
              </div>
            ) : (
              pinnedMessages.map((m) => (
                <div
                  key={m._id}
                  className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-3 hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 mt-0.5">
                      {m.avatar ? (
                        <AvatarImage
                          src={m.avatar}
                          alt={m.displayName || m.username}
                        />
                      ) : null}
                      <AvatarFallback
                        className={getColorFromName(
                          m.displayName || m.username
                        )}
                      >
                        {getInitials(m.displayName || m.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-sm text-white">
                          {m.displayName || m.username}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {m.text && (
                        <p className="text-sm text-white wrap-break-word">
                          {renderMessageText(m)}
                        </p>
                      )}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {m.attachments.map((file, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-xs text-neutral-400"
                            >
                              {file.mimetype.startsWith("image/") ? (
                                <ImageIcon className="h-3 w-3" />
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
                              <span className="truncate">{file.filename}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            handlePinMessage(m._id);
                          }}
                          className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-neutral-700"
                        >
                          <Pin className="h-3 w-3 mr-1" />
                          Unpin
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            handleCopyMessageLink(m._id);
                            setShowPinnedMessages(false);
                          }}
                          className="h-7 text-xs hover:bg-neutral-700"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
