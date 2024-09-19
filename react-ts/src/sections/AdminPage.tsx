
import React, { useState, useEffect } from "react";

const AdminPage = () => {
  const [data, setData] = useState([]);
  const [failedMessages, setFailedMessages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editReference, setEditReference] = useState("");

  useEffect(() => {
    fetchData();
    fetchFailedMessages();
  }, []);
  const handleEdit = (id, currentAmount, currentReference) => {
    setEditingId(id);
    setEditAmount(currentAmount.toString());
    setEditReference(currentReference);
  };
  const handleSaveEdit = async (userId, contributionId) => {
    try {
      const response = await fetch(
        `//edit-contribution/${userId}/${contributionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: parseFloat(editAmount),
            reference: editReference,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to edit contribution");
      }
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error("Error editing contribution:", error);
    }
  };
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    amount: 0,
    reference: "", // Add this line
  });

  // Handle input change and update form data state
  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle form submission
  const handleSubmit = (e: any) => {
    e.preventDefault();

    fetch("/api/new", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...formData, timestamp: new Date() }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      })
      .finally(() => {
        fetchData();
      });
  };

  const fetchData = async () => {
    try {
      const response = await fetch("/api/data");
      const jsonData = await response.json();
      setData(jsonData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchFailedMessages = async () => {
    try {
      const response = await fetch("/api/failed-messages");
      const jsonData = await response.json();
      setFailedMessages(jsonData);
    } catch (error) {
      console.error("Error fetching failed messages:", error);
    }
  };

  const handleVerify = async (userId, contributionId) => {
    try {
      await fetch(`/api/verify/${userId}/${contributionId}`, {
        method: "PUT",
      });
      fetchData();
    } catch (error) {
      console.error("Error verifying contribution:", error);
    }
  };

  const handleRemove = async (userId, contributionId) => {
    if (window.confirm("Are you sure you want to remove this contribution?")) {
      try {
        const response = await fetch(
          `/api/remove-contribution/${userId}/${contributionId}`,
          {
            method: "PUT",
          }
        );
        if (!response.ok) {
          throw new Error("Failed to remove contribution");
        }
        fetchData();
      } catch (error) {
        console.error("Error removing contribution:", error);
      }
    }
  };

  const handleRetryMessage = async (messageId) => {
    try {
      const response = await fetch(`/api/retry-message/${messageId}`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to retry message");
      }
      fetchFailedMessages();
    } catch (error) {
      console.error("Error retrying message:", error);
    }
  };

  const handleRetryAllMessages = async () => {
    try {
      const response = await fetch("/api/retry-all-failed", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to retry all messages");
      }
      fetchFailedMessages();
    } catch (error) {
      console.error("Error retrying all messages:", error);
    }
  };

  const [buttons, setButtons] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [newAction, setNewAction] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchButtons();
  }, []);

  const fetchButtons = async () => {
    try {
      const response = await fetch(`${"/api"}/buttons`);
      if (!response.ok) throw new Error("Failed to fetch buttons");
      const data = await response.json();
      setButtons(data);
    } catch (err) {
      setError("Failed to fetch buttons. Please try again.");
    }
  };

  const addButton = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${"/api"}/buttons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel, action: newAction }),
      });
      if (!response.ok) throw new Error("Failed to add button");
      setNewLabel("");
      setNewAction("");
      fetchButtons();
    } catch (err) {
      setError("Failed to add button. Please try again.");
    }
  };

  const deleteButton = async (id) => {
    try {
      const response = await fetch(`${"/api"}/buttons/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete button");
      fetchButtons();
    } catch (err) {
      setError("Failed to delete button. Please try again.");
    }
  };
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="mb-8">
        <form onSubmit={handleSubmit}>
          <label>
            Name:{" "}
            <input name="name" value={formData.name} onChange={handleChange} />
          </label>
          <br />
          <label>
            Phone No.:{" "}
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </label>
          <br />
          <label>
            Email Id:{" "}
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </label>
          <br />
          <label>
            Amount:{" "}
            <input
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              type="number"
            />
          </label>
          <label>
            Reference:{" "}
            <input
              name="reference"
              value={formData.reference}
              onChange={handleChange}
            />
          </label>
          <br />
          <button type="submit">Submit</button>
        </form>
        <h2 className="text-xl font-semibold mb-2">Contributions Table</h2>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Name</th>
              <th className="border border-gray-300 p-2">Phone</th>
              <th className="border border-gray-300 p-2">Email</th>
              <th className="border border-gray-300 p-2">Amount</th>
              <th className="border border-gray-300 p-2">Timestamp</th>
              <th className="border border-gray-300 p-2">Verified</th>
              <th className="border border-gray-300 p-2">Reference</th>
              <th className="border border-gray-300 p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item._id}>
                <td className="border border-gray-300 p-2">{item.name}</td>
                <td className="border border-gray-300 p-2">{item.phone}</td>
                <td className="border border-gray-300 p-2">{item.email}</td>
                <td className="border border-gray-300 p-2">
                  {editingId === item._id ? (
                    <input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  ) : (
                    item.amount
                  )}
                </td>
                <td className="border border-gray-300 p-2">
                  {new Date(item.timestamp).toLocaleString()}
                </td>
                <td className="border border-gray-300 p-2">
                  {item.verified ? "Yes" : "No"}
                </td>
                <td className="border border-gray-300 p-2">
                  {editingId === item._id ? (
                    <input
                      type="text"
                      value={editReference}
                      onChange={(e) => setEditReference(e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  ) : (
                    item.reference
                  )}
                </td>
                <td className="border border-gray-300 p-2">
                  {editingId === item._id ? (
                    <button
                      onClick={() => handleSaveEdit(item.userId, item._id)}
                      className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEdit(item._id, item.amount)}
                      className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(item.userId, item._id)}
                    className="bg-red-500 text-white px-2 py-1 rounded mr-2"
                  >
                    Remove
                  </button>
                  {!item.verified && (
                    <button
                      onClick={() => handleVerify(item.userId, item._id)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded"
                    >
                      Verify
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Button Management
        </h1>

        <form onSubmit={addButton} className="mb-6">
          <div className="mb-4">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Button Label"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <input
              type="text"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="Button Action"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center"
          >
            + Add Button
          </button>
        </form>

        {error && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4"
            role="alert"
          >
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-2">
          {buttons.map((button) => (
            <div
              key={button._id}
              className="flex justify-between items-center p-3 bg-gray-100 rounded-md"
            >
              <span className="text-gray-800">
                {button.label} - {button.action}
              </span>
              <button
                onClick={() => deleteButton(button._id)}
                className="text-red-500 hover:text-red-700 focus:outline-none"
              >
                delete
              </button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Failed Messages</h2>
        <button
          onClick={async () => {
            const response = await fetch("/api/login");
            const jsonData = await response.json();
            const qrLink = jsonData?.qrCode;
            if (qrLink) {
              window.open("/api" + qrLink);
            } else {
              alert(jsonData?.message);
            }
          }}
          className="bg-green-500 text-white px-4 py-2 rounded mb-2"
        >
          Login
        </button>
        <button
          onClick={handleRetryAllMessages}
          className="bg-green-500 text-white px-4 py-2 rounded mb-2"
        >
          Retry All Failed Messages
        </button>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">User</th>
              <th className="border border-gray-300 p-2">Message</th>
              <th className="border border-gray-300 p-2">Timestamp</th>
              <th className="border border-gray-300 p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {failedMessages.map((message) => (
              <tr key={message._id}>
                <td className="border border-gray-300 p-2">
                  {message.userId.name}
                </td>
                <td className="border border-gray-300 p-2">
                  {message.message}
                </td>
                <td className="border border-gray-300 p-2">
                  {new Date(message.timestamp).toLocaleString()}
                </td>
                <td className="border border-gray-300 p-2">
                  <button
                    onClick={() => handleRetryMessage(message._id)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPage;
