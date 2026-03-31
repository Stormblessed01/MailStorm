export interface ComposeSnapshot {
  subject: string;
  bodyText: string;
}

export function findComposeRootFromButton(button: HTMLElement): HTMLElement | null {
  return button.closest(".M9") as HTMLElement | null;
}

export function readComposeContent(composeRoot: HTMLElement): ComposeSnapshot {
  const subjectInput = composeRoot.querySelector<HTMLInputElement>("input[name='subjectbox']");
  const body = composeRoot.querySelector<HTMLElement>("div[aria-label='Message Body']");

  return {
    subject: subjectInput?.value ?? "",
    bodyText: body?.innerText ?? ""
  };
}

export function insertMailMergeButton(composeRoot: HTMLElement, onClick: (button: HTMLButtonElement) => void): void {
  const toolbar = composeRoot.querySelector<HTMLElement>(".aDh");
  if (!toolbar) {
    return;
  }

  if (toolbar.querySelector(".mailstorm-mail-merge-btn")) {
    return;
  }

  const button = document.createElement("button");
  button.className = "mailstorm-mail-merge-btn";
  button.type = "button";
  button.textContent = "Mail Merge";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick(button);
  });

  toolbar.appendChild(button);
}
