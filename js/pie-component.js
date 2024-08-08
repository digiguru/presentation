class PieChart extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `
      @keyframes pin {
        from { --p: 0; }
        to { --p: ${amount}; }
        }
        @keyframes pout {
        from { --p: ${amount}; }
        to { --p: 0; }
        }
      `;
      shadow.appendChild(style);
  
      const pieContainer = document.createElement('div');
      pieContainer.classList.add('pie', 'animate');
  
      const percentage = document.createElement('em');
      percentage.textContent = this.getAttribute('data-amount') + '%';
  
      const descriptionSlot = document.createElement('slot');
      descriptionSlot.name = 'description';
  
      pieContainer.appendChild(percentage);
      pieContainer.appendChild(descriptionSlot);
      shadow.appendChild(pieContainer);
    }
  
    static get observedAttributes() {
      return ['data-amount'];
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'data-amount') {
        this.shadowRoot.querySelector('em').textContent = newValue + '%';
      }
    }
  }
  
  customElements.define('pie-chart', PieChart);