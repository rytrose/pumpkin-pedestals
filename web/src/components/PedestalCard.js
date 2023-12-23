import "../styles/animations.css";

const PedestalCard = ({ address, color, blinking }) => {
  return (
    <div className="flex flex-col items-center gap-8">
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 173.20508075688772 200"
        className={`w-[60%] sm:w-1/3 lg:w-[30%] xl:w-1/4 h-auto ${
          blinking ? "pulse-animation" : ""
        }`}
        style={{
          filter: `drop-shadow(0 0 8px #${color})`,
        }}
      >
        <path
          fill="#faf8f2"
          d="M86.60254037844386 0L173.20508075688772 50L173.20508075688772 150L86.60254037844386 200L0 150L0 50Z"
        />
        <circle
          cx={87}
          cy={100}
          r={10}
          fill={`#${color}68`}
          style={{ filter: `drop-shadow(0 0 8px #${color})` }}
        />
      </svg>
    </div>
  );
};

export default PedestalCard;
