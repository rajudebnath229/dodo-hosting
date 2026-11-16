const createButton = document.getElementById("create-server");
const notice = document.getElementById("notice");
createButton?.addEventListener("click", () => {
  notice.textContent = "Server creation is not connected yet. This preview needs a secure backend and a configured Minecraft host.";
  notice.classList.add("notice-active");
});