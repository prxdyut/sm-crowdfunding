import React, { useState, useEffect } from "react";

export default function ContributorsPage() {
  const [contributors, setContributors] = useState([]);

  useEffect(() => {
    fetchContributors();
  }, []);

  const fetchContributors = async () => {
    try {
      const response = await fetch("/api/public-contributors");
      if (!response.ok) {
        throw new Error("Failed to fetch contributors");
      }
      const data = await response.json();
      setContributors(data);
    } catch (error) {
      console.error("Error fetching contributors:", error);
    }
  };

  // Function to format amount to Indian Rupees
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Function to split contributors into columns
  const splitContributors = (contributors) => {
    const columns = [[], [], []];
    contributors.forEach((contributor) => {
      const columnIndex = (contributor.rank - 1) % 3;
      columns[columnIndex].push(contributor);
    });
    return columns;
  };

  const contributorColumns = splitContributors(contributors);

  return (
    <div className="min-h-screen">
      <div className="px-10">
        <div className="text-center">
          <h6>Contributors</h6>
          <p>
            Thank you for your generous support! Your contribution reassures us
            that our vision is shared, validating that devotees / audiences want
            to see this documentary come to life.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-10">
          {contributorColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="border p-6 rounded-2xl">
              <table className="w-full">
                <tbody>
                  {column.map((contributor) => (
                    <tr key={contributor._id}>
                      <td>{contributor.name}</td>
                      <td className="text-right">{formatAmount(contributor.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <p>Please Note: The contributors are listed based on their ranking, with the first column showing ranks 3, 6, 9, etc., the second column showing ranks 1, 4, 7, etc., and the third column showing ranks 2, 5, 8, etc. Multiple Contributions from the same account (Phone Number/Email ID) have been automatically added and updated.</p>
      </div>
    </div>
  );
}