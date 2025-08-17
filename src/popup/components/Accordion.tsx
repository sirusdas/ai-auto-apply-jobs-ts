import React, { useState } from 'react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleAccordion = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="accordion">
      <div className="accordion-item">
        <div 
          className={`accordion-header ${isOpen ? 'active' : ''}`} 
          onClick={toggleAccordion}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              toggleAccordion(e as any);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <span>{title}</span>
          <span className="accordion-icon">{isOpen ? '▲' : '▼'}</span>
        </div>
        <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Accordion;