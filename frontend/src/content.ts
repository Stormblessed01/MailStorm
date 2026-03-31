import { openMailMergePanel } from "./ui/panel";
import { openTrackingPanel } from "./ui/trackingPanel";
import { ensureStyles } from "./ui/styles";

function createSidebarButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.innerHTML = `<span class="mailstorm-left-nav-icon">M</span><span>${label}</span>`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function insertLeftSidebarButtons(): void {
  ensureStyles();
  const nav = document.querySelector<HTMLElement>("div[role='navigation']");
  if (!nav) {
    return;
  }

  if (nav.querySelector(".mailstorm-left-nav-wrap")) {
    return;
  }

  const container = document.createElement("div");
  container.className = "mailstorm-left-nav-wrap";

  const mergeButton = createSidebarButton("Mail Merge", "mailstorm-left-nav-button", () => {
    void openMailMergePanel({ subject: "", bodyText: "" });
  });

  const trackingButton = createSidebarButton("Track Merges", "mailstorm-left-nav-button mailstorm-left-nav-button-secondary", () => {
    void openTrackingPanel();
  });

  container.appendChild(mergeButton);
  container.appendChild(trackingButton);

  const composeButton = nav.querySelector<HTMLElement>(".T-I.T-I-KE");
  if (composeButton?.parentElement) {
    composeButton.parentElement.insertAdjacentElement("afterend", container);
  } else {
    nav.prepend(container);
  }
}

const observer = new MutationObserver(() => {
  insertLeftSidebarButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

insertLeftSidebarButtons();
