import palkhi from "../assets/palkhi-1.png";

export default function DontationProgress() {
  // Bug : dont keep it less than 20%
  const percent = 20;
  return (
    <div className=" w-full mx-10">
      <div className="h-10 w-full relative">
        <div
          className={`absolute z-10 bg-transparent -mt-4 flex justify-end `}
          style={{ width: `${percent + (percent > 95 ? -4 : 0)}%` }}
        >
          <img src={palkhi} className=" h-20 bg-transparent translate-x-1/2" />
        </div>
        <div
          className={`bg-white absolute h-10 rounded-xl`}
          style={{ width: `${percent}%` }}
        ></div>
        <div className=" bg-white opacity-50 w-full h-full rounded-xl"></div>
      </div>
    </div>
  );
}
