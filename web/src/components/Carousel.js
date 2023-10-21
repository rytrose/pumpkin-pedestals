import { useSwipeable } from "react-swipeable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Carousel as MTCarousel, IconButton } from "@material-tailwind/react";
import { useRef } from "react";

const Carousel = ({ className, items }) => {
  const handlePrevRef = useRef();
  const handleNextRef = useRef();

  const swipeHandlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      if (handleNextRef.current) handleNextRef.current();
    },
    onSwipedRight: (eventData) => {
      if (handlePrevRef.current) handlePrevRef.current();
    },
  });

  return (
    <MTCarousel
      {...swipeHandlers}
      className={className}
      prevArrow={({ handlePrev, firstIndex }) => {
        handlePrevRef.current = handlePrev;
        return (
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
        );
      }}
      nextArrow={({ handleNext, lastIndex }) => {
        handleNextRef.current = handleNext;
        return (
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
        );
      }}
    >
      {items.map((item, i) => (
        <div key={`carousel-${i}`}>{item}</div>
      ))}
    </MTCarousel>
  );
};

export default Carousel;
