import React, { useEffect, useRef } from "react";
import "./index.scss";

const SortModal = ({ show, setShow, options, selectedValue, onSelect }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        if (show && modalRef.current) {
            // Find the active button and focus it, or the first button
            setTimeout(() => {
                const activeBtn = modalRef.current.querySelector(".sortOption.active");
                if (activeBtn) activeBtn.focus();
                else {
                    const firstBtn = modalRef.current.querySelector(".sortOption");
                    if (firstBtn) firstBtn.focus();
                }
            }, 100);
        }
    }, [show]);

    if (!show) return null;

    const handleSelect = (val) => {
        onSelect(val);
        setShow(false);
    };

    const handleKeyDown = (e, val) => {
        const code = e.keyCode;
        if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
            e.preventDefault();
            handleSelect(val);
        } else if (e.key === "Escape" || e.key === "Back" || code === 27 || code === 10009 || code === 461 || code === 4) {
            e.preventDefault();
            e.stopPropagation();
            setShow(false);
        }
    };

    return (
        <div className={`sortModal ${show ? "visible" : ""}`} ref={modalRef}>
            <div className="opacityLayer" onClick={() => setShow(false)}></div>
            <div className="modalContent">
                <h2>Sort Options</h2>
                <div className="optionsList">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            className={`sortOption ${selectedValue === opt.value ? "active" : ""}`}
                            tabIndex="0"
                            onClick={() => handleSelect(opt.value)}
                            onKeyDown={(e) => handleKeyDown(e, opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SortModal;
