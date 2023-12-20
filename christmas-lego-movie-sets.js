

function checkForReturn(event) {
    if (event.keyCode === 13) {
        // Prevent the default form submit behavior
        event.preventDefault();

        // Call your function here
        addPromptColumn(new PromptColumn(event.target.value));
        event.target.value = '';
    }
}

class Run {
    constructor(prompt, index) {
        this.Prompt = prompt;
        this.index = index;
        this.status = 'running';
        const p = document.createElement('p');
        p.textContent = this.Prompt.HiddenPromptText;
        this.Output = p;
        this.Image = '';
        this.query();
    }
    async query() {
        try {
            let output = await queryImage(this.Prompt);
            this.status = 'complete';
            this.Image = output;
            const img = document.createElement('img');
            img.src = output;
            img.classList.add('clickable');
            
            this.Output = img;
        } catch (error) {
            this.status = 'error';
            const p = document.createElement('p');
            p.textContent = error.message;
            this.Output = p;
        }
        pagerender();
    }
    render() {
        let li = document.createElement('li');
        li.classList.add(this.status);
        let div = document.createElement('div');
        div.appendChild(this.Output);
        //let sub = document.createElement('sub');
        //sub.textContent = this.index;
        li.appendChild(div);
        //li.appendChild(sub);
        return li;
    }
}
class Prompt {
    constructor(promptText) {
        this.SlugPrompt = slugify(promptText);
        this.InputPromptText = promptText;
        this.HiddenPromptText = `As "Christmas Lego Movie Magic", your primary role is to make images for fun new designs Lego box sets based on movies, with a keen focus on movie knowledge and character likeness (but also legally conscious and not violating any copyright so you know how to translate real character names into descriptions of them). 
            When given a movie title, analyze the film to identify its most iconic scene and create a detailed Lego set design that captures this moment, in a christmassy style. The box art should feature the movie title, relevant imagery from the movie in the top right corner, and a Lego depiction of the key scene, ensuring character likeness is well-represented. 
            Include Christmas elements creatively for added appeal. While you're not creating real Lego pieces, your designs should be imaginative and demonstrate a deep understanding of the movie. Don't engage in discussions about the movies, just go straight for the image. 
            Bear in mind most movies have copywritten the main characters, scenes, props and details.  
            You must not mention their names because that would prevent the image from being generated. 
            Instead try to describe them in intricate detail. So don't say Luke Skywalker - instead say "a blonde haired man holding a lightsaber dressed in a black cat suit". Make it as close as legally possible to the original scene. It should include the movie title on the box. 
            The movie I want you to create an image for is ` + promptText;
    }
    render() {
        return this.HiddenPromptText;
    }
}
class PromptColumn {
    constructor(promptText) {
        this.TotalRuns = 0;
        this.Runs = [];
        this.Outputs = [];
        this.Prompt = new Prompt(promptText);
        this.query();
    }
    query() {
        this.Runs.push(new Run(this.Prompt, this.TotalRuns));
        this.TotalRuns++;
        //this.Runs.push(fetch(this.HiddenPromptText));
        //this.Outputs.push(new Output(this.PromptText));
    }
    render() {
        // Create the main <li> element
        const liElement = document.createElement('li');

        // Create and append <h1> element
        const h1Element = document.createElement('h1');
        h1Element.textContent = this.Prompt.InputPromptText;
        liElement.appendChild(h1Element);

        // Create and append <sub> element
        //const subElement = document.createElement('sub');
        //subElement.textContent = this.TotalRuns;
        //liElement.appendChild(subElement);

        // Create and append <ul> element
        const ulElement = document.createElement('ul');

        // Iterate over the Runs array and append each item
        this.Runs.forEach(run => {
            const runElement = run.render(); // Assuming render() returns an HTMLElement
            ulElement.appendChild(runElement);
        });

        liElement.appendChild(ulElement);

        return liElement;
    }
}
async function fetchImage (prompt) {
    /*if(prompt.SlugPrompt === "error") {
        throw new Error('fail');
    } else {
        const response = {output: "https://placekitten.com/1024/1024"};
        return new Promise((resolve) => {
            setTimeout(() => resolve(response), 1000);
        });
    }*/
    
    
    const baseURL = 'https://ai-prompt-writer.vercel.app/api/image';
    const response = await fetch(baseURL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({prompt: prompt.HiddenPromptText})
    });
    return await response.json();
    
}
async function queryImage (prompt) {
    const raw = await fetchImage(prompt);
    const outputData = raw.output;
    return outputData;
}

function pagerender() {
    let output = document.getElementById('output');
    output.innerHTML = "";
    allPromptColumns.forEach(prompt => {
        output.appendChild(prompt.render());
    });
    [...document.getElementsByClassName("clickable")].forEach(img => {
        img.addEventListener("click", function() {
            console.log("click", this);
            openLightbox(img.src);
        });
    })
    

}
function slugify(string) {
    return string
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-']/g, '');
}
function addPromptColumn(newPromptColumn) {
    let existingPrompts = allPromptColumns.filter(prompt => prompt.Prompt.SlugPrompt === newPromptColumn.Prompt.SlugPrompt);
    if (existingPrompts.length > 0) {
        existingPrompts[0].query();
    } else {
        allPromptColumns.push(newPromptColumn);
    }
    pagerender();
}

function openLightbox(src) {
    document.getElementById('lightboximg').src = src;
    document.getElementById('lightbox').style.display = 'flex';
}
function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
}
const allPromptColumns = [];


document.getElementById("prompt").addEventListener("keyup", checkForReturn);
document.getElementById("save").addEventListener("click", function() {
    try {
        const serializedState = JSON.stringify(allPromptColumns);
        localStorage.setItem("save", serializedState);
        console.log("State saved successfully.");
    } catch (err) {
        console.error("Error saving state to localStorage:", err);
    }
});