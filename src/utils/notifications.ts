export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export function showToast(message: string, type: NotificationType = 'info') {
    // Check if we are in a DOM environment
    if (typeof document === 'undefined') return;

    const container = document.getElementById('toast-container') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);

    const style = document.createElement('style');
    style.textContent = `
    #toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .toast {
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(120%);
      transition: transform 0.3s ease;
      min-width: 200px;
    }
    .toast.show {
      transform: translateX(0);
    }
    .toast-success { background-color: #2ecc71; }
    .toast-error { background-color: #e74c3c; }
    .toast-warning { background-color: #f1c40f; color: #333; }
    .toast-info { background-color: #3498db; }
  `;
    document.head.appendChild(style);

    return container;
}
