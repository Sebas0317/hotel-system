import { BsCalendar } from "react-icons/bs";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../style/datepicker.css";

export default function CheckOut({
  popperPlacement = "bottom-start",
  popperFullWidth = false,
}) {
  const [endDate, setEndDate] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const suppressOpenRef = useRef(false);
  const DATEPICKER_OPEN = "datepicker-open";
  const ID = "checkout";

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    const onOtherOpen = (e) => {
      if (e.detail?.id !== ID) setIsOpen(false);
    };
    document.addEventListener(DATEPICKER_OPEN, onOtherOpen);
    return () => document.removeEventListener(DATEPICKER_OPEN, onOtherOpen);
  }, []);

  useLayoutEffect(() => {
    if (!popperFullWidth || !isOpen) return;
    const w = wrapperRef.current?.offsetWidth;
    if (w) document.body.style.setProperty("--datepicker-popper-width", `${w}px`);
    return () => {
      document.body.style.removeProperty("--datepicker-popper-width");
    };
  }, [popperFullWidth, isOpen]);

  const handleIconClick = () => {
    suppressOpenRef.current = true;
    setIsOpen((o) => {
      if (!o) document.dispatchEvent(new CustomEvent(DATEPICKER_OPEN, { detail: { id: ID } }));
      return !o;
    });
    setTimeout(() => {
      suppressOpenRef.current = false;
    }, 200);
  };

  const handleOpen = () => {
    if (suppressOpenRef.current) return;
    document.dispatchEvent(new CustomEvent(DATEPICKER_OPEN, { detail: { id: ID } }));
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleChange = (date) => {
    setEndDate(date);
    suppressOpenRef.current = true;
    setIsOpen(false);
    setTimeout(() => {
      suppressOpenRef.current = false;
    }, 200);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center justify-end h-full w-full min-w-0">
      <div
        className="absolute z-10 pr-8 cursor-pointer"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleIconClick();
        }}
        onClick={(e) => e.preventDefault()}
        onKeyDown={(e) => e.key === "Enter" && handleIconClick()}
        role="button"
        tabIndex={0}
        aria-label="Toggle calendar"
      >
        <div>
          <BsCalendar className="text-accent text-base" />
        </div>
      </div>
      <DatePicker
        className="w-full h-full"
        selected={endDate}
        placeholderText="Check out"
        onChange={handleChange}
        popperPlacement={popperPlacement}
        popperClassName={popperFullWidth ? "datepicker-popper-fullwidth" : undefined}
        open={isOpen}
        onInputClick={handleOpen}
        onCalendarOpen={handleOpen}
        onCalendarClose={handleClose}
        onClickOutside={handleClose}
      />
    </div>
  );
}
