import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Carousel as MTCarousel, IconButton } from "@material-tailwind/react";

const Carousel = ({ className, items }) => {
  return (
    <MTCarousel
      className={className}
      prevArrow={({ handlePrev, firstIndex }) =>
        !firstIndex && (
          <IconButton
            variant="text"
            color="gray"
            size="lg"
            onClick={handlePrev}
            className="!absolute top-2/4 left-1 -translate-y-2/4"
          >
            <FontAwesomeIcon icon="chevron-left"></FontAwesomeIcon>
          </IconButton>
        )
      }
      nextArrow={({ handleNext, lastIndex }) =>
        !lastIndex && (
          <IconButton
            variant="text"
            color="gray"
            size="lg"
            onClick={handleNext}
            className="!absolute top-2/4 !right-1 -translate-y-2/4"
          >
            <FontAwesomeIcon icon="chevron-right"></FontAwesomeIcon>
          </IconButton>
        )
      }
    >
      {items.map((item, i) => (
        <div key={`carousel-${i}`}>{item}</div>
      ))}
    </MTCarousel>
  );
};

export default Carousel;
