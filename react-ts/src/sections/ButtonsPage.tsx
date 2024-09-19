import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = "/api";

const ButtonManagement = () => {
  const [open, setopen] = useState(true);
  const [buttons, setButtons] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [newAction, setNewAction] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchButtons();
  }, []);

  const fetchButtons = async () => {
    try {
      const response = await fetch(`${API_URL}/buttons`);
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
      const response = await fetch(`${API_URL}/buttons`, {
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
      const response = await fetch(`${API_URL}/buttons/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete button");
      fetchButtons();
    } catch (err) {
      setError("Failed to delete button. Please try again.");
    }
  };

  return (
    <>
      <dialog open={open} className=" fixed bottom-0">
        <button onClick={() => setopen(false)}> close</button>
        {buttons.map((button) => (
          <Link
            to={button.action}
            target="_blank"
            className="text-red-500 hover:text-red-700 focus:outline-none"
          >
            {button.label}
          </Link>
        ))}
      </dialog>
    </>
  );
};

export default ButtonManagement;
