import { useState } from "react";

export default function ContributePage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    amount: 0,
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
      });

    formData.amount > 100
      ? setDialogState("amountReached")
      : setDialogState("contribute");
  };

  const [dialogState, setDialogState] = useState("");

  return (
    <>
      <dialog open={dialogState == "contribute"}>
        <img style={{ height: "10rem", width: "10rem" }} />
        <h6>
          We deeply appreciate your invaluable contribution. Your effort will
          have a significant impact.
        </h6>
        <p>
          Note: You can also contribute multiple times. Your Contribution will
          be Reflected once its been verified by us.
        </p>
        <button
          onClick={() => {
            setDialogState("banktransfer");
            fetch("/api/bank-transfer", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(formData),
            })
              .then((response) => response.json())
              .then((data) => {
                console.log("Success:", data);
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          }}
        >
          transfer using bank
        </button>
        <button
          onClick={() => {
            setDialogState("");
          }}
        >
          close
        </button>
      </dialog>
      <dialog open={dialogState == "amountReached"}>
        <p>
          We can’t accept this big amount through UPI. You can Contribute using
          Bank Transfer. Bank Details will be sent to your Whatsapp Shortly.
        </p>

        <h6>
          We deeply appreciate your invaluable contribution. Your effort will
          have a significant impact.
        </h6>
        <p>
          Note: You can also contribute multiple times. Your Contribution will
          be Reflected once its been verified by us.
        </p>
        <button
          onClick={() => {
            setDialogState("");
          }}
        >
          close
        </button>
      </dialog>
      <dialog open={dialogState == "banktransfer"}>
        <p></p>

        <h6>
          We deeply appreciate your invaluable contribution. Your effort will
          have a significant impact.
        </h6>
        <p>
          Note: You can also contribute multiple times. Your Contribution will
          be Reflected once its been verified by us.
        </p>
        <button
          onClick={() => {
            setDialogState("");
          }}
        >
          close
        </button>
      </dialog>
      <div className="min-h-screen">
        <div className="px-10">
          <div className="grid grid-cols-10">
            <div className="col-span-6"></div>
            <div className="col-span-4">
              <form onSubmit={handleSubmit}>
                <label>
                  Name:{" "}
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
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
                <br />
                <button type="submit">Submit</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
