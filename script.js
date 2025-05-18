document.addEventListener("DOMContentLoaded", function () {
  const output = document.getElementById("output");
  const welcomeMessage = document.querySelector(".welcome-message");
  let commandHistory = JSON.parse(localStorage.getItem("history")) || [];
  let historyIndex = commandHistory.length;
  let currentColorClass = "text-white";
  let currentInput = document.getElementById("command-input");

  const suggestions = [
    "help", "clear", "date", "about", "dir", "mkdir", "touch", "cd",
    "ipconfig", "ipconfig /all", "color", "theme", "cat", "calc"
  ];

  currentInput.focus();

  currentInput.addEventListener("keydown", async function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const command = this.textContent.trim();
      this.textContent = "";

      if (command) {
        displayCommand(command);
        const result = await processCommand(command);
        if (result !== null) displayOutput(result);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      navigateHistory(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      navigateHistory(1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const partial = currentInput.textContent.trim().toLowerCase();
      const match = suggestions.find(cmd => cmd.startsWith(partial));
      if (match) {
        currentInput.textContent = match;
        moveCursorToEnd(currentInput);
      }
    }
  });

  function displayCommand(command) {
    const commandLine = document.createElement("div");
    commandLine.className = "command";
    commandLine.innerHTML = `<span class="prompt">$</span> <span class="${currentColorClass}">${escapeHtml(
      command
    )}</span>`;
    output.insertBefore(commandLine, output.lastElementChild);
    commandHistory.push(command);
    localStorage.setItem("history", JSON.stringify(commandHistory));
    historyIndex = commandHistory.length;
  }

  function displayOutput(text) {
    const outputDiv = document.createElement("div");
    outputDiv.className = `output ${currentColorClass}`;
    outputDiv.innerHTML = formatText(text);
    output.insertBefore(outputDiv, output.lastElementChild);
    output.scrollTop = output.scrollHeight;
  }

  function formatText(text) {
    return escapeHtml(text).replace(/\n/g, "<br>").replace(/ /g, "&nbsp;");
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function navigateHistory(direction) {
    if (commandHistory.length === 0) return;
    historyIndex += direction;

    if (historyIndex < 0) historyIndex = 0;
    if (historyIndex >= commandHistory.length) {
      historyIndex = commandHistory.length;
      currentInput.textContent = "";
      return;
    }

    currentInput.textContent = commandHistory[historyIndex];
    moveCursorToEnd(currentInput);
  }

  function moveCursorToEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async function processCommand(command) {
    // Support command aliases:
    const aliasMap = {
      ls: "dir",
      clr: "clear"
    };

    const original = command.split(" ")[0].toLowerCase();
    if (aliasMap[original]) {
      command = aliasMap[original] + command.slice(original.length);
    }

    if (command.toLowerCase().startsWith("color")) {
      return handleColorCommand(command);
    }

    if (command.toLowerCase().startsWith("calc")) {
      return handleCalc(command);
    }

    if (command.toLowerCase().startsWith("cat")) {
      // New: use server to fetch the actual content of the file
      return await handleCatCommand(command);
    }

    switch (command.toLowerCase()) {
      case "help":
        return `Available commands:
help          - Show this help message
clear         - Clear the terminal history
date          - Show current date and time
about         - About this terminal
dir [path]    - List directory contents
mkdir <name>  - Create a new directory
touch <name>  - Create a new file
cd [path]     - Change current directory
ipconfig      - Show network configuration
color <name>  - Change text color
calc <exp>    - Simple calculator (e.g. calc 5 + 3)
cat <file>    - View file contents
credits        - To know the contributions`;

      case "clear":
        clearTerminal();
        return null;

      case "date":
        return new Date().toString();

      case "about":
        return "Web Terminal v0.1 - Created with HTML, CSS, JS, and PHP";
      case "credits":
         return "Web Terminal v0.1 - Created by Dhirendra Kathayat";
      default:
        if (command.toLowerCase().startsWith("dir")) {
          const path = command.substring(3).trim();
          return await fetchCommand("dir", path || ".");
        } else if (command.toLowerCase().startsWith("mkdir")) {
          const dirName = command.substring(5).trim();
          if (!dirName) return "Error: Please specify a directory name";
          return await fetchCommand("mkdir", dirName);
        } else if (command.toLowerCase().startsWith("touch")) {
          const fileName = command.substring(5).trim();
          if (!fileName) return "Error: Please specify a file name";
          return await fetchCommand("touch", fileName);
        } else if (command.toLowerCase().startsWith("cd")) {
          const path = command.substring(2).trim();
          return await fetchCommand("cd", path || "");
        } else if (command.toLowerCase().startsWith("ipconfig")) {
          const option = command.substring(8).trim();
          return await fetchCommand("ipconfig", option);
        } else {
          return `Error: Command not recognized: ${command}`;
        }
    }
  }

  function handleColorCommand(command) {
    const color = command.substring(5).trim().toLowerCase();
    const colorMap = {
      red: "text-red",
      green: "text-green",
      blue: "text-blue",
      yellow: "text-yellow",
      cyan: "text-cyan",
      magenta: "text-magenta",
      white: "text-white"
    };

    if (colorMap[color]) {
      currentColorClass = colorMap[color];
      return `Text color changed to ${color}.`;
    } else {
      return `Unknown color: ${color}. Try red, green, blue, yellow, cyan, magenta, or white.`;
    }
  }

  function handleCalc(command) {
    const expression = command.substring(5).trim();
    try {
      const result = eval(expression);
      return `Result: ${result}`;
    } catch (e) {
      return "Invalid calculation expression.";
    }
  }

  async function handleCatCommand(command) {
    const fileName = command.substring(3).trim();
    // Use the fetchCommand method with type "cat" to load actual file contents from the server
    return await fetchCommand("cat", fileName);
  }

  function clearTerminal() {
    for (let i = output.children.length - 1; i >= 0; i--) {
      const child = output.children[i];
      if (
        !child.classList.contains("welcome-message") &&
        !child.classList.contains("command-line")
      ) {
        output.removeChild(child);
      }
    }
  }

  async function fetchCommand(type, command) {
    try {
      const response = await fetch("command.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `type=${encodeURIComponent(type)}&command=${encodeURIComponent(command)}`
      });
      return await response.text();
    } catch (error) {
      return "Error: Connection to server failed";
    }
  }
});
