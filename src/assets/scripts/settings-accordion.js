// Accordion functionality for settings page
document.addEventListener('DOMContentLoaded', function() {
  // Handle tab switching functionality
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.addEventListener('click', (e) => {
      const target = e.target;
      
      // Check if the clicked element is a button with data-tab attribute
      if (target.tagName === 'BUTTON' && target.hasAttribute('data-tab')) {
        e.preventDefault();
        
        const tab = target.getAttribute('data-tab');
        
        // Update active tab
        document.querySelectorAll('.sidebar button').forEach(button => {
          button.classList.remove('active');
        });
        target.classList.add('active');
        
        // Try to call the renderComponent function from the global scope
        // This function should be exposed by settings.js
        if (typeof renderComponent === 'function') {
          renderComponent(tab);
        } else {
          console.warn('renderComponent function not available');
        }
      }
    });
  }
  
  // Handle accordion functionality for SearchTimerConfig component
  // This will be initialized when the component is rendered
  function initSearchTimerAccordions() {
    const accordionHeaders = document.querySelectorAll('.search-timer-config .accordion h3');
    
    accordionHeaders.forEach(header => {
      // Remove any existing event listeners to prevent duplicates
      const clone = header.cloneNode(true);
      header.parentNode?.replaceChild(clone, header);
      
      // Add click event listener
      clone.addEventListener('click', function() {
        const accordion = this.parentElement;
        const panel = this.nextElementSibling;
        
        // Toggle active class on accordion
        accordion.classList.toggle('active');
        
        // Toggle open class on panel
        if (panel) {
          panel.classList.toggle('open');
        }
      });
    });
  }
  
  // Expose the function globally so it can be called from React components
  window.initSearchTimerAccordions = initSearchTimerAccordions;
  
  console.log('Settings accordion script loaded');
});