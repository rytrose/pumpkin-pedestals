import { Carousel as MTCarousel } from "@material-tailwind/react";

const Carousel = ({ className, items }) => {
  return (
    <MTCarousel className={className}>
      {items.map((item, i) => (
        <div key={`carousel-${i}`}>{item}</div>
      ))}
    </MTCarousel>
  );
};

export default Carousel;
