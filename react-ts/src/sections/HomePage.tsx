import React from "react";
import saiBaba1 from "../assets/sai-baba-1.jpg";
import DontationProgress from "../components/DontationProgress";

export default function HomePage() {
  console.log(saiBaba1);
  return (
    <div className={`min-h-screen w-full flex flex-col items-center py-8 gap-10`}>
      <div className=" flex-1"></div>
      <DontationProgress />
      <button className=" bg-primary py-2 px-4 text-3xl rounded-2xl font-bold">
        Contribute Now
      </button>
      <p className=" text-3xl font-bold">ओम भवती भिक्षां देही</p>
    </div>
  );
}
