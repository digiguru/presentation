window.addEventListener("DOMContentLoaded", (event) => {
	const collapsibles = document.getElementsByClassName("collapsible");
	[...collapsibles].forEach(collapsible => {
		collapsible.addEventListener("click", () => {
			const content = collapsible.nextElementSibling;
			content.style.display = content.style.display === "none" ? "block" : "none";
		});
	});
    
});

Reveal.addEventListener( 'ready', function( event ) {
    Reveal.add = function( content = ''){ 
       
        let newSlide;
        const currentSlide = Reveal.getCurrentSlide();
        if(content) {
            newSlide = document.createElement( 'section' );
            newSlide.que
            newSlide.classList.add( 'future' );
            newSlide.setAttribute('data-auto-animate','');
            newSlide.innerHTML = content;
            currentSlide.insertAdjacentHTML("afterend", newSlide.outerHTML);
        } 
        
        //const slides = Reveal.getSlidesElement();
        //const index = Reveal.getIndices().v;
       
        
        //slides.insertBefore(newSlide,slides.querySelectorAll('section:nth-child('+(index+1)+')')[0])
        Reveal.sync()
    }
});

const baseURL = 'https://ai-prompt-writer.vercel.app/',
    imageURL = baseURL + 'api/image',
    textURL = baseURL + 'api/raw',
    audioUrl = baseURL + 'api/voice';

async function fetchImage (prompt) {
	const response = await fetch(imageURL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({prompt})
	});
	return await response.json();
}
async function fetchText (context, messages,input) {
	const post = {
		system: context,
		examples: messages,
		prompt: input
	}
	const response = await fetch(textURL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(post)
	});
	return await response.json();
}
async function fetchAudio(input, voice) {
	const response = await fetch(audioUrl + "?voice=" + voice, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({input})
	});
	return await response.blob();
}

// Defines the custom element with our appropriate name, <apocalyptic-warning>
async function queryImage (prompt, imgTag) {
	try {
		const data = await fetchImage(prompt);
		const outputData = data.output;
		
		console.log("IMAGE:", outputData);
		
		if(imgTag) {
			imgTag.src = outputData;
			imgTag.classList.remove("hidden");
		}
		return data;
	} catch (ex) {
		console.error(ex);
		//if(output) output.value = ex;
	}
}
			// Defines the custom element with our appropriate name, <apocalyptic-warning>
async function queryGPT (context, messages, input, output, processVoice) {
	try {
        const pushOutputToNextSlide = false;
		const data = await fetchText(context, messages, input);
		const outputData = data.output;
		
		console.log("TEXT:", outputData);
		setOutput(output, outputData, pushOutputToNextSlide);
		if(processVoice) {
            getAudio(outputData, processVoice, output);
        }
		
		return data;
	} catch (ex) {
		console.error(ex);
		if(output) output.value = ex;
	}
}
function setOutput(output, outputData, pushOutputToNextSlide) {
    if(output) {
        output.value = outputData;
        output.appendChild(document.createTextNode(outputData));
        if(pushOutputToNextSlide) Reveal.add(output.cloneNode(true).outerHTML);
    }
}

async function getAudio(input, voice, output) {
	//Create temp link to the audio element
	const audioDiv = document.createElement('div');
	audioDiv.innerText = "loading audio...";

	const node = output.parentNode;
	node.appendChild(audioDiv);

	var blob = await fetchAudio(input, voice);
	var blobURL = URL.createObjectURL(blob);

	audioDiv.innerHTML = 
		`<audio controls="controls">
			<source src=${blobURL} type="audio/mp3">
		</audio>`
	node.appendChild(audioDiv);
	return blobURL;
}

const setup = async () => {
    const html = await fetch("js/gpt-component.html")
        .then(stream => stream.text());
    const parser = new DOMParser();
    const template = parser.parseFromString(html, 'text/html').querySelector('template');
    define(template);
}
setup();
function define(template) {
    customElements.define("gpt-input",
        class extends HTMLElement {

            get fallback() {
                return this.getAttribute('data-fallback');
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


            // Called anytime a new custom element is created
            constructor() {

                // Calls the parent constructor, i.e. the constructor for `HTMLElement`, so that everything is set up exactly as we would for creating a built in HTML element
                super();
                this.attachShadow({ mode: 'open'}).appendChild(template.content.cloneNode(true))
                this.sendGPT = this.sendGPT.bind(this);
                this.toggleQuickHides = this.toggleQuickHides.bind(this);
                this.$output = this.shadowRoot.querySelector('.output');
                this.$context = this.shadowRoot.querySelector('.context');
                this.$contextLabel = this.shadowRoot.querySelector('.context-label');
                this.$input = this.shadowRoot.querySelector('#input');
                this.$img = this.shadowRoot.querySelector('img');
                this.$conversation = this.shadowRoot.querySelector('.context-conversation');
                this.$button = this.shadowRoot.querySelector('button');
                this.$inputs = this.shadowRoot.querySelectorAll(".input");
                this.$inputLabel = this.shadowRoot.querySelectorAll(".input-label");
                this.$conversations = this.shadowRoot.querySelectorAll(".conversation");
                this.$quickHides = this.shadowRoot.querySelectorAll(".quick-hide");
                this.$history = this.shadowRoot.querySelector(".context-history");
                this.$contextHasHistory = this.shadowRoot.querySelector(".context-has-history");
                this.uniqueID = this.MakeUniqueID() + "_GPT";

                //this.$quickHides.forEach(x => x.classList.add("hidden"));
            }

            MakeUniqueID() {
                if(window.uniqueID) {
                    return window.uniqueID++;
                } else {
                    window.uniqueID = 1;
                    return window.uniqueID;
                }
            }
            async sendGPT() {
                
                const contextValue = this.$context?.assignedNodes()[0].innerText;
                const inputValue = this.$input.value;
                let messages = [];
                this.$output.value = "";
                this.$output.setAttribute('placeholder', "...loading...");
                if(this.showConversation) {
                    var conversation = this.$conversation?.assignedNodes()[0];
                    messages = [...conversation.children].map(x => x.innerText);
                }
                if (this.showImage) {
                    console.log("queryImage", {inputValue, img: this.$img});
                    let image = await queryImage(inputValue, this.$img);
                    this.addHistory({title: inputValue, raw: image});
                } else {
                    console.log("queryGPT", {contextValue, messages, inputValue, output: this.$output, processVoice: this.processVoice});
                    let output = await queryGPT(contextValue, messages, inputValue, this.$output, this.processVoice);
                    this.addHistory({title: inputValue, raw: output});
                }
            }
            toggleQuickHides() {
                console.log("contextLabel clicked");
                const hasInputHidden = this.$quickHides[0].classList.contains("hidden");
                if(hasInputHidden) {
                    this.$quickHides.forEach(x => x.classList.remove("hidden"));
                } else {
                    this.$quickHides.forEach(x => x.classList.add("hidden"));
                }
            }
            getHistory() {
                if(localStorage && localStorage.getItem(this.uniqueID)) {
                    return JSON.parse(localStorage.getItem(this.uniqueID));
                }
                return [];
            }
            addHistory(rawData) {
                let history = this.getHistory();
                history.push(rawData);
                if(localStorage) {
                    localStorage.setItem(this.uniqueID, JSON.stringify(history));
                }
                this.renderHistory();
            }
            renderHistory() {
                let history = this.getHistory();
                if(history.length > 0) {
                    this.$contextHasHistory.classList.remove("hidden");
                    let list = document.createElement('ul');
                    let output = this.$output;
                    history.forEach((x, i) => {
                        let li = document.createElement('li');
                        li.setAttribute('data-raw', Base64.encode(JSON.stringify(x.raw)));
                        li.innerText = i + ". " + x.title.slice(0, 16);
                        li.addEventListener('click', function() { 

                            let raw = JSON.parse(Base64.decode(this.getAttribute('data-raw')));
                            console.log("clicked", raw, this); 
                            setOutput(output, raw.output, false);
                            
                        });
                        list.appendChild(li);
                    });
                    this.$history.appendChild(list);
                } else {
                    this.$contextHasHistory.classList.add("hidden");
                }
            }

            //invoked each time the custom element is appended into a document-connected element
            connectedCallback() {
                
                if (this.showImage) {
                    this.$output.classList.add("hidden");
                }
                this.renderHistory();
                
                this.$button.addEventListener('click', this.sendGPT);
                this.$contextLabel.addEventListener('click', this.toggleQuickHides);
                if(!this.showInput) {
                    this.$inputs.forEach(x => x.setAttribute('class', "hidden"));
                }
                if(!this.showConversation) {
                    this.$conversations.forEach(x => x.setAttribute('class', "hidden"));
                }
            }
        }
    )
}