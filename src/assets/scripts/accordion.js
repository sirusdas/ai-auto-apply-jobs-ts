// Accordion functionality
document.addEventListener('DOMContentLoaded', function() {
  // Handle accordion headers
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  
  accordionHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const accordionItem = this.parentElement;
      const accordionContent = this.nextElementSibling;
      const accordionIcon = this.querySelector('.accordion-icon');
      
      // Toggle active class on header
      this.classList.toggle('active');
      
      // Toggle open class on content
      accordionContent.classList.toggle('open');
      
      // Toggle icon rotation
      if (accordionIcon) {
        accordionIcon.classList.toggle('rotated');
      }
    });
  });
  
  // Handle nested accordions (if any)
  document.addEventListener('click', function(e) {
    // Handle any dynamically added accordion headers
    if (e.target.classList.contains('accordion-header') || e.target.closest('.accordion-header')) {
      const header = e.target.classList.contains('accordion-header') ? 
        e.target : e.target.closest('.accordion-header');
      
      const accordionItem = header.parentElement;
      const accordionContent = header.nextElementSibling;
      
      // Close other accordions in the same group if needed
      const accordionGroup = header.closest('.accordion-group');
      if (accordionGroup) {
        const allHeaders = accordionGroup.querySelectorAll('.accordion-header');
        const allContents = accordionGroup.querySelectorAll('.accordion-content');
        
        // Close others if needed (for single-open accordions)
        // Uncomment the following lines if you want only one accordion open at a time
        /*
        allHeaders.forEach(item => {
          if (item !== header) {
            item.classList.remove('active');
          }
        });
        
        allContents.forEach(content => {
          if (content !== accordionContent) {
            content.classList.remove('open');
          }
        });
        */
      }
      
      // Toggle current accordion
      header.classList.toggle('active');
      if (accordionContent) {
        accordionContent.classList.toggle('open');
      }
    }
  });
});