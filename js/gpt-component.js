window.addEventListener("DOMContentLoaded", (event) => {
	const collapsibles = document.getElementsByClassName("collapsible");
	[...collapsibles].forEach(collapsible => {
		collapsible.addEventListener("click", () => {
			const content = collapsible.nextElementSibling;
			content.style.display = content.style.display === "none" ? "block" : "none";
		});
	})
});


async function fetchImage (prompt) {
	const response = await fetch('https://ai-prompt-writer.vercel.app/api/image', {
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
	const response = await fetch('https://ai-prompt-writer.vercel.app/api/raw', {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(post)
	});
	return await response.json();
}
//Perform the API call
async function fetchAudio(input) {
	const response = await fetch('https://ai-prompt-writer.vercel.app/api/voice', {
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
		
		console.log(outputData);
		
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
		const data = await fetchText(context, messages, input);
		const outputData = data.output;
		
		console.log(outputData);
		
		if(output) output.value = outputData;
		if(processVoice) getAudio(outputData, output);
		
		return data;
	} catch (ex) {
		console.error(ex);
		if(output) output.value = ex;
	}
}


async function getAudio(input, output) {
	//Create temp link to the audio element
	const audioDiv = document.createElement('div');
	audioDiv.innerText = "loading audio...";

	const node = output.parentNode;
	node.appendChild(audioDiv);

	var blob = await fetchAudio(input);
	var blobURL = URL.createObjectURL(blob);
	//var audio0 = new Audio(blobURL);
	//audio0.play();
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
        // Ensures that we have all the default properties and methods of a built in HTML element
        class extends HTMLElement {
            $output;
            $context;
            $input;
            $img;
            $conversation;
            $button;
            $inputs;
            $conversations;

            // define getters and setters for attributes
            get showConversation() {
                return this.getAttribute('data-show-conversation') === 'true';
            }

            get processVoice() {
                return this.getAttribute('data-process-voice') === 'true';
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

                // Grabs the <template> and stores it in `warning`
                //let rawTemplate = document.getElementById("GPT");

                // Stores the contents of the template in `mywarning`
                //let myTemplate = rawTemplate.content;

                //var shadow = this.attachShadow({mode: "open"});
                //shadow.innerHTML = template;
                this.attachShadow({ mode: 'open'}).appendChild(template.content.cloneNode(true))
                //this.shadowRoot.appendChild(myTemplate.cloneNode(true));
                console.log("constructed");
                
                this.sendGPT = this.sendGPT.bind(this);
                this.$output = this.shadowRoot.querySelector('.output');
                this.$context = this.shadowRoot.querySelector('.context');
                this.$input = this.shadowRoot.querySelector('#input');
                this.$img = this.shadowRoot.querySelector('img');
                this.$conversation = this.shadowRoot.querySelector('.context-conversation');
                this.$button = this.shadowRoot.querySelector('button');
                this.$inputs = this.shadowRoot.querySelectorAll(".input");
                this.$conversations = this.shadowRoot.querySelectorAll(".conversation");
            }
            // static get observedAttributes() {
            // 	return ['data-show-conversation', 'data-process-voice', 'data-show-image', 'data-show-input'];
            // }


            
            sendGPT() {
                
                const contextValue = this.$context?.assignedNodes()[0].innerText;
                const inputValue = this.$input.value;
                let messages = [];
                this.$output.value = "";
                this.$output.setAttribute('placeholder', "...loading...");
                console.log("sendGPT", contextValue, inputValue, this.$output);
                if(this.showConversation) {
                    console.log(this.$conversation);
                    var conversation = this.$conversation?.assignedNodes()[0];
                    console.log(conversation);
                    messages = [...conversation.children].map(x => x.innerText);
                    console.log(messages);
                }
                console.log("TWO", this.showImage );
                if (!this.showImage) {
                    console.log("queryGPT");
                    queryGPT(contextValue, messages, inputValue, this.$output, this.processVoice);
                } else {
                    console.log("queryImage");
                    queryImage(inputValue, this.$img);
                }
            }
            connectedCallback() {
                const { shadowRoot } = this;
                
                //this.showImage = this.getAttribute("data-show-image") === 'true';
                if (this.showImage) {
                    this.$output.classList.add("hidden");
                }
                console.log("ONE", this.showImage );

                this.$button.addEventListener('click', this.sendGPT);
                console.log("attr", this.showConversation, shadowRoot, this);//.getAttribute('data-show-input'));
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