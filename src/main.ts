// main.ts

// Function to initialize the webpage
function initializePage() {
    // Create a button element
    const button = document.createElement('button');
    button.textContent = 'Click Me';

    // Set up the click event listener
    button.onclick = () => {
        alert('You clicked the button!');
    };

    // Add the button to the body of the webpage
    document.body.appendChild(button);
}

// Calls the initializePage function to set up the page elements when the script loads
initializePage();
// todo
