import React from "react";

export default function TopBar() {
  return (
    <div className=" fixed top-0 w-full flex px-12">
      <div className=" bg-black w-20"></div>
      <div className=" flex-1 flex items-center justify-center flex-col gap-2 my-6">
        <p className=" text-4xl font-bold">Shirdi Sai Padyatra Documentary</p>
        <p>Embark on soul-stirring journey with us</p>
      </div>
      <div className=" bg-black w-20"></div>
    </div>
  );
}
