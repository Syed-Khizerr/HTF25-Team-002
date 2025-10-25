import { useEffect, useState } from "react";
import { socket } from "@/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Hash, Send, Users, Edit3 } from "lucide-react";
import "../Index.css";

type Message = {
  _id: string;
  room: string;
  username: string;
  text: string;
  createdAt: string;
  reactions?: Record<string, number>;
  pinned?: boolean;
};

export function Home() {
  const [rooms, setRooms] = useState<string[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [presence, setPresence] = useState<string[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [username, setUsername] = useState<string>(() => {
    return (
      (localStorage.getItem("username") as string) ||
      `Guest${Math.floor(Math.random() * 9000) + 1000}`
    );
  });

  useEffect(() => {
    fetch("http://localhost:5000/rooms")
      .then((r) => r.json())
      .then((data) => {
        setRooms(data.map((d: any) => d.name || d));
        if (data && data.length > 0) setCurrentRoom(data[0].name || data[0]);
      })
      .catch((err) => {
        console.error("Failed to fetch rooms:", err);
        setRooms(["general", "math", "physics"]);
        setCurrentRoom((r) => r || "general");
      });
  }, []);

  useEffect(() => {
    if (!currentRoom) return;
    socket.emit("joinRoom", { room: currentRoom, username });

    fetch(`http://localhost:5000/rooms/${currentRoom}/messages`)
      .then((r) => r.json())
      .then((data) => setMessages(data))
      .catch((err) => {
        console.error("Failed to fetch messages:", err);
        setMessages([]);
      });

    return () => {
      socket.emit("leaveRoom", { room: currentRoom });
    };
  }, [currentRoom, username]);

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
    function onPresence(list: string[]) {
      setPresence(list);
    }

    socket.on("loadMessages", onLoad);
    socket.on("newMessage", onNew);
    socket.on("updateMessage", onUpdate);
    socket.on("deletedMessage", onDeleted);
    socket.on("presence", onPresence);

    return () => {
      socket.off("loadMessages", onLoad);
      socket.off("newMessage", onNew);
      socket.off("updateMessage", onUpdate);
      socket.off("deletedMessage", onDeleted);
      socket.off("presence", onPresence);
    };
  }, []);

  const sendMessage = () => {
    if (!currentRoom || !text.trim()) return;
    socket.emit("sendMessage", {
      room: currentRoom,
      username,
      text: text.trim(),
    });
    setText("");
  };

  const saveName = () => {
    localStorage.setItem("username", username);
    setIsEditingName(false);
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
    <div className="h-screen w-screen bg-neutral-800 flex">
      {/* Left Sidebar - Rooms */}
      <aside className="pt-4 w-64 flex flex-col bg-neutral-900 text-white">
        <div className=" position-relative">
          <h1 className="px-4 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent transition-all  duration-500 hover:pb-2 hover:scale-105  hover:from-purple-600 hover:to-blue-600 hover:cursor-pointer">
            StudyRooms
          </h1>
          <p className="px-4 text-xs  mt-1 mb-5">Collaborative Learning</p>
          <div className="h-[1px] max-w-full position-relative inset-x-0 -bottom-0   bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600"></div>
        </div>

        <div className="flex-1 p-3  overflow-auto">
          <div className="text-xs font-semibold  px-2 py-1">TEXT CHANNELS</div>
          {rooms.map((r) => (
            <button
              key={r}
              onClick={() => setCurrentRoom(r)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                currentRoom === r
                  ? "bg-gradient-to-r  from-blue-600 to-purple-600 from text-transparent bg-clip-text font-medium hover:cursor-pointer"
                  : "hover:bg-gradient-to-r hover:cursor-pointer hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
              }`}
            >
              <Hash className="h-4 w-4" />
              {r}
            </button>
          ))}
        </div>

        <div className="p-2 hover:cursor-pointer hover:bg-neutral-800 rounded-md w-58 mx-auto mb-3">
          <div className="flex items-center gap-2 p-2 rounded-md">
            <Avatar className="h-8 w-8">
              <AvatarFallback className={getColorFromName(username)}>
                {getInitials(username)}
              </AvatarFallback>
            </Avatar>
            {isEditingName ? (
              <div className="flex-1 flex gap-1">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  className="h-7 text-xs"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={saveName}
                >
                  ✓
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{username}</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-b-[0.01px] border-b-neutral-400 px-4 flex items-center justify-between  backdrop-blur">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-neutral-400" />
            <h2 className="font-semibold text-lg text-white">
              {currentRoom || "Select a room"}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{presence.length}</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-800">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Hash className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Be the first to say something!</p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m._id}
                className="flex gap-3 hover:bg-muted/10 -mx-2 px-2 py-1 rounded-lg"
              >
                <Avatar className="h-10 w-10 mt-0.5">
                  <AvatarFallback className={getColorFromName(m.username)}>
                    {getInitials(m.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-md text-white">
                      {m.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-white mt-1 break-words">
                    {m.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 mx-2  rounded-lg  bg-neutral-700">
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                currentRoom ? `Message #${currentRoom}` : "Select a room first"
              }
              className="flex-1 bg-neutral-700 selection:bg-blue-500 decoration-0 border-none text-white placeholder:text-neutral-500 active:outline-none focus:outline-none"
              disabled={!currentRoom}
            />
            <Button
              onClick={sendMessage}
              disabled={!currentRoom || !text.trim()}
              className="bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white disabled:opacity-50 hover:cursor-pointer "
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Members */}
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
                key={`${p}-${i}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-800/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={getColorFromName(p)}>
                      {getInitials(p)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-neutral-900 rounded-full" />
                </div>
                <span className="text-sm font-medium text-white">{p}</span>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

export default Home;
