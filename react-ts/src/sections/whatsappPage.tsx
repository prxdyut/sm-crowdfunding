import React, { useState, useEffect } from "react";

interface FailedMessage {
  userId: {
    name: string;
    phone: string;
  };
  message: string;
  error: string;
  screen: string;
}

interface Stats {
  messagesToday: number;
  messagesThisMonth: number;
  sendRate: number;
  failedMessages: number;
}

const AutoReloadingImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setKey((prevKey) => prevKey + 1);
    }, 5000); // Reload every 5 seconds

    return () => clearInterval(timer);
  }, []);

  return <img key={key} src={src} alt={alt} className={className} />;
};

export default function Whatsapp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    messagesToday: 0,
    messagesThisMonth: 0,
    sendRate: 0,
    failedMessages: 0,
  });
  const [failedMessages, setFailedMessages] = useState<FailedMessage[]>([]);

  useEffect(() => {
    checkApiStatus();
    getFailedMessages();
  }, []);

  const checkApiStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/whatsapp/api-status");
      const data = await response.json();
      console.log(data);
      setIsLoggedIn(data.isLoggedIn);
    } catch (err) {
      setError("Failed to check API status");
    } finally {
      setLoading(false);
    }
  };

  const getFailedMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/whatsapp/failed-messages"
      );
      const data = await response.json();
      setFailedMessages(data.failedMessages);
      if (data?.failedMessages?.length)
        setStats((prev) => ({
          ...prev,
          failedMessages: data?.failedMessages?.length || 0,
        }));
    } catch (err) {
      setError("Failed to fetch failed messages");
    } finally {
      setLoading(false);
    }
  };

  const retryFailedMessages = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      await fetch("/api/whatsapp/retry-failed-messages", {
        method: "POST",
      });
      alert("Retrying failed messages");
      getFailedMessages();
    } catch (err) {
      setError("Failed to retry messages");
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/whatsapp/login");
      const data = await response.json();
      if (data.data.qrCodeUrl) {
        setQrCode(data.data.qrCodeUrl);
      } else {
        setIsLoggedIn(true);
        setQrCode(null);
      }
    } catch (err) {
      setError("Failed to log in");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await fetch("/api/whatsapp/logout", { method: "POST" });
      setIsLoggedIn(false);
      setQrCode(null);
    } catch (err) {
      setError("Failed to log out");
    } finally {
      setLoading(false);
    }
  };

  const restart = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      await fetch("/api/whatsapp/reload", { method: "POST" });
      checkApiStatus();
    } catch (err) {
      setError("Failed to restart");
    } finally {
      setLoading(false);
    }
  };
  function formDataToObject(formData) {
    const obj = {};
    formData.forEach((value, key) => {
      if (obj[key]) {
        // Handle multiple values for the same key (e.g., checkboxes or multi-selects)
        if (Array.isArray(obj[key])) {
          obj[key].push(value);
        } else {
          obj[key] = [obj[key], value];
        }
      } else {
        obj[key] = value;
      }
    });
    return obj;
  }
  const sendTestMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      setLoading(true);
      await fetch("/api/whatsapp/send-test-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formDataToObject(formData)),
      });
      alert("Test message sent successfully!");
    } catch (err) {
      console.log(err)
      setError("Failed to send test message");
    } finally {
      setLoading(false);
    }
  };

  const getScreenshot = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/whatsapp/screenshot");
      const data = await response.json();
      window.open(`/api/${data.screenshotPath}`);
    } catch (err) {
      setError("Failed to get screenshot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-100">
      <div className="overflow-auto h-full flex-1 p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Whatsapp</h1>

        <div className="bg-gray-200 rounded-3xl p-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Status: </h2>
              <span
                className={`px-2 py-1 text-sm rounded-full ${
                  isLoggedIn ? "bg-green-500" : "bg-red-500"
                } text-white`}
              >
                {isLoggedIn ? "Connected" : "Not Connected"}
              </span>
            </div>
            <div>
              <button onClick={checkApiStatus} className="p-2 text-blue-500">
                check
              </button>
              <button onClick={login} className="p-2 text-green-500">
                login
              </button>
              <button onClick={logout} className="p-2 text-red-500">
                logout
              </button>
              <button onClick={restart} className="p-2 text-yellow-500">
                restart
              </button>
              <button onClick={getScreenshot} className="p-2 text-purple-500">
                shot
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="bg-gray-200 rounded-3xl p-4 text-center">
              <p className="text-gray-600">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {qrCode && (
          <div className="mb-6 flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <AutoReloadingImage
                src={`//assets${qrCode}`}
                alt="Whatsapp QR"
                className="max-w-full h-auto"
              />
            </div>
          </div>
        )}

        <div className="bg-gray-200 rounded-3xl p-4">
          <h3 className="text-lg font-medium mb-4">Test Message</h3>
          <form
            onSubmit={sendTestMessage}
            className="space-y-4 sm:space-y-0 sm:flex sm:gap-4"
          >
            <input
              type="text"
              name="phoneNumber"
              placeholder="Phone Number"
              className="w-full p-2 rounded-lg"
            />
            <input
              type="text"
              name="contactName"
              placeholder="Contact Name"
              className="w-full p-2 rounded-lg"
            />
            <input
              type="text"
              name="message"
              placeholder="Message"
              className="w-full p-2 rounded-lg"
            />
            <button
              type="submit"
              className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center justify-center"
            >
              <i className="fas fa-paper-plane mr-2"></i> Send
            </button>
          </form>
        </div>

        <div className="bg-gray-200 rounded-3xl p-4 flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-medium">Failed Messages</h3>
            <button
              onClick={retryFailedMessages}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <i className="fas fa-sync-alt mr-2"></i> Retry Failed Messages
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {failedMessages?.length > 0 ? (
              failedMessages?.map((msg, index) => (
                <div key={index} className="bg-red-200 rounded-lg p-4 mb-2">
                  <p className="font-medium">
                    To: {msg.userId.name} ({msg.userId.phone})
                  </p>
                  <p className="text-gray-600">Message: {msg.message}</p>
                  <p className="text-red-600">Error: {msg.error}</p>
                  {msg.screen && (
                    <a
                      href={`/whatsapp/errors${msg.screen}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 border border-red-500 text-red-500 px-2 py-1 rounded inline-flex items-center"
                    >
                      <i className="fas fa-exclamation-triangle mr-2"></i>{" "}
                      Preview Error
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">No failed messages</p>
            )}
          </div>
        </div>

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
}
