import templateHtml from './gpt-input.html?raw';
import { addSlide } from './slides.js';

const baseURL = 'https://ai-prompt-writer.vercel.app/';
const imageURL = `${baseURL}api/image`;
const textURL = `${baseURL}api/raw`;
const streamURL = `${baseURL}api/stream`;
const audioURL = `${baseURL}api/voice`;
let uniqueId = 0;

async function fetchImage(prompt) {
  const response = await fetch(imageURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  return response.json();
}

async function fetchText(context, messages, input) {
  const response = await fetch(textURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: context, examples: messages, prompt: input }),
  });
  return response.json();
}

async function fetchTextStream(context, messages, input, onChunk) {
  const response = await fetch(streamURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: context, examples: messages, prompt: input }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const delta = decoder.decode(value, { stream: true });
    full += delta;
    if (onChunk) onChunk(delta, full);
  }

  return { output: full };
}

async function fetchAudio(input, voice) {
  const response = await fetch(`${audioURL}?voice=${encodeURIComponent(voice)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  return response.blob();
}

function setOutput(deck, output, outputData, pushOutputToNextSlide = false) {
  if (!output) return;
  const value = outputData ?? '';
  output.value = String(value);
  if (pushOutputToNextSlide) addSlide(deck, output.cloneNode(true).outerHTML);
}

async function getAudio(input, voice, output) {
  const audioDiv = document.createElement('div');
  audioDiv.innerText = 'loading audio...';
  output.parentNode.appendChild(audioDiv);

  const blob = await fetchAudio(input, voice);
  const blobURL = URL.createObjectURL(blob);
  audioDiv.innerHTML = `<audio controls="controls"><source src="${blobURL}" type="audio/mp3"></audio>`;
  return blobURL;
}

async function queryImage(prompt, imgTag) {
  try {
    // Preserve the current presentation behaviour: image generation is still
    // using the test image rather than calling the production image endpoint.
    const data = { output: 'https://picsum.photos/200/300?random=1' };
    if (imgTag) {
      imgTag.src = data.output;
      imgTag.classList.remove('hidden');
    }
    return data;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

async function queryGPT(deck, context, messages, input, output, processVoice) {
  try {
    const data = await fetchText(context, messages, input);
    const outputData = data.output;
    setOutput(deck, output, outputData, false);
    if (processVoice) await getAudio(outputData, processVoice, output);
    return data;
  } catch (error) {
    console.error(error);
    if (output) output.value = error.message || String(error);
    return undefined;
  }
}

async function queryGPTStream(context, messages, input, output, processVoice) {
  try {
    if (output) output.value = '';
    const data = await fetchTextStream(context, messages, input, (_delta, full) => {
      if (!output) return;
      output.value = full;
      output.scrollTop = output.scrollHeight;
    });
    if (processVoice) await getAudio(data.output, processVoice, output);
    return data;
  } catch (error) {
    console.error(error);
    if (output) output.value = error.message || String(error);
    return undefined;
  }
}

function assignedText(slot) {
  const element = slot?.assignedElements?.()[0];
  if (element) return element.innerText;
  return slot?.assignedNodes?.()[0]?.textContent || '';
}

function conversationMessages(slot) {
  const element = slot?.assignedElements?.()[0];
  if (!element) return [];
  return [...element.children].map(child => child.innerText);
}

function historyOutput(raw) {
  if (raw && typeof raw === 'object' && 'output' in raw) return raw.output;
  return raw ?? '';
}

function installCollapsibles() {
  for (const collapsible of document.getElementsByClassName('collapsible')) {
    if (collapsible.dataset.gptCollapsibleReady === 'true') continue;
    collapsible.dataset.gptCollapsibleReady = 'true';
    collapsible.addEventListener('click', () => {
      const content = collapsible.nextElementSibling;
      if (content) content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });
  }
}

function templateElement() {
  const documentFragment = new DOMParser().parseFromString(templateHtml, 'text/html');
  const template = documentFragment.querySelector('template');
  if (!template) throw new Error('GPT input template is missing its <template> root.');
  return template;
}

export function installGptInput(deck) {
  installCollapsibles();

  if (customElements.get('gpt-input')) return customElements.get('gpt-input');
  const template = templateElement();

  class GptInput extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
      this.sendGPT = this.sendGPT.bind(this);
      this.toggleQuickHides = this.toggleQuickHides.bind(this);
      this.$output = this.shadowRoot.querySelector('.output');
      this.$context = this.shadowRoot.querySelector('.context');
      this.$contextLabel = this.shadowRoot.querySelector('.context-label');
      this.$input = this.shadowRoot.querySelector('#input');
      this.$img = this.shadowRoot.querySelector('img');
      this.$conversation = this.shadowRoot.querySelector('.context-conversation');
      this.$button = this.shadowRoot.querySelector('button');
      this.$inputs = this.shadowRoot.querySelectorAll('.input');
      this.$conversations = this.shadowRoot.querySelectorAll('.conversation');
      this.$quickHides = this.shadowRoot.querySelectorAll('.quick-hide');
      this.$history = this.shadowRoot.querySelector('.context-history');
      this.$contextHasHistory = this.shadowRoot.querySelector('.context-has-history');
      this.uniqueID = `${++uniqueId}_GPT`;
      this.renderHistory();
    }

    get showConversation() {
      return this.getAttribute('data-show-conversation') === 'true';
    }

    get processVoice() {
      return this.getAttribute('data-process-voice');
    }

    get showImage() {
      return this.getAttribute('data-show-image') === 'true';
    }

    get showInput() {
      return this.getAttribute('data-show-input') === 'true';
    }

    get stream() {
      return this.getAttribute('data-stream') === 'true';
    }

    getHistory() {
      try {
        const stored = localStorage.getItem(this.uniqueID);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }

    addHistory(rawData) {
      const history = this.getHistory();
      history.push(rawData);
      try {
        localStorage.setItem(this.uniqueID, JSON.stringify(history));
      } catch {
        // History is optional; keep the live demo working when storage is blocked.
      }
      this.renderHistory();
    }

    renderHistory() {
      const history = this.getHistory();
      this.$history.replaceChildren();

      if (!history.length) {
        this.$contextHasHistory.classList.add('hidden');
        return;
      }

      this.$contextHasHistory.classList.remove('hidden');
      history.forEach((entry, index) => {
        const item = document.createElement('li');
        item.innerText = `${index}. ${entry.title.slice(0, 16)}`;
        item.addEventListener('click', () => {
          setOutput(deck, this.$output, historyOutput(entry.raw), false);
        });
        this.$history.appendChild(item);
      });
    }

    async sendGPT() {
      const contextValue = assignedText(this.$context);
      let inputValue = this.$input.value;
      const messages = this.showConversation ? conversationMessages(this.$conversation) : [];
      this.$output.value = '';
      this.$output.setAttribute('placeholder', '...loading...');

      if (this.showImage) {
        inputValue = contextValue ? `${contextValue} ${inputValue}` : inputValue;
        const image = await queryImage(inputValue, this.$img);
        this.addHistory({ title: inputValue, raw: image });
        return;
      }

      const output = this.stream
        ? await queryGPTStream(contextValue, messages, inputValue, this.$output, this.processVoice)
        : await queryGPT(deck, contextValue, messages, inputValue, this.$output, this.processVoice);
      this.addHistory({ title: inputValue, raw: output });
    }

    toggleQuickHides() {
      const shouldShow = this.$quickHides[0]?.classList.contains('hidden');
      this.$quickHides.forEach(element => element.classList.toggle('hidden', !shouldShow));
    }

    connectedCallback() {
      if (this.dataset.gptReady === 'true') return;
      this.dataset.gptReady = 'true';

      if (this.showImage) this.$output.classList.add('hidden');
      if (!this.showInput) this.$inputs.forEach(element => element.classList.add('hidden'));
      if (!this.showConversation) this.$conversations.forEach(element => element.classList.add('hidden'));

      this.$button.addEventListener('click', this.sendGPT);
      this.$contextLabel.addEventListener('click', this.toggleQuickHides);
      this.renderHistory();
    }
  }

  customElements.define('gpt-input', GptInput);
  document.documentElement.dataset.gptInputReady = 'true';
  return GptInput;
}

export { fetchImage };
