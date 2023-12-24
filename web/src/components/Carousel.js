import { useSwipeable } from "react-swipeable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Carousel as MTCarousel, IconButton } from "@material-tailwind/react";
import { useRef, useState, useEffect, useCallback } from "react";

const Carousel = ({ className, items, onChange }) => {
  const [index, setIndex] = useState(0);
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

  useEffect(() => {
    onChange(index);
  }, [onChange, index]);

  const onIndexChange = useCallback(
    (delta, handleFunc) => {
      return function () {
        const newIndex = index + delta;
        setIndex(newIndex);
        if (!!onChange) onChange(newIndex);
        handleFunc();
      };
    },
    [index, onChange]
  );

  return (
    <MTCarousel
      {...swipeHandlers}
      className={className}
      prevArrow={({ handlePrev, activeIndex, firstIndex }) => {
        const handleClick = onIndexChange(-1, handlePrev);
        handlePrevRef.current = handleClick;
        return (
          !firstIndex && (
            <IconButton
              variant="text"
              color="gray"
              size="lg"
              onClick={handleClick}
              className="!absolute top-2/4 left-1 -translate-y-2/4"
            >
              <FontAwesomeIcon icon="chevron-left"></FontAwesomeIcon>
            </IconButton>
          )
        );
      }}
      nextArrow={({ handleNext, activeIndex, lastIndex }) => {
        const handleClick = onIndexChange(1, handleNext);
        handleNextRef.current = handleClick;
        return (
          !lastIndex && (
            <IconButton
              variant="text"
              color="gray"
              size="lg"
              onClick={handleClick}
              className="!absolute top-2/4 !right-1 -translate-y-2/4"
            >
              <FontAwesomeIcon icon="chevron-right"></FontAwesomeIcon>
            </IconButton>
          )
        );
      }}
      navigation={() => {}}
    >
      {items.map((item, i) => (
        <div key={`carousel-${i}`}>{item}</div>
      ))}
    </MTCarousel>
  );
};

export default Carousel;
