const PedestalCard = ({ address, color, blinking }) => {
  return (
    <div className="border-[1px] border-red-100 rounded-xl">
      <div>Address: {address}</div>
      <div>Color: {color}</div>
      <div>Blinking? {blinking}</div>
    </div>
  );
};

export default PedestalCard;
