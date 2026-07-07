(() => {
  const STEP_DELAY = 760;
  const REDUCED_MOTION_DELAY = 520;

  const copy = {
    White: {
      title: "White clearance handoff",
      subtitle: "Employee-tier route confirmed.",
      steps: [
        "Reading white card phrase",
        "Confirming employee baseline",
        "Opening white systems"
      ]
    },
    Blue: {
      title: "Blue clearance handoff",
      subtitle: "Client operations route confirmed.",
      steps: [
        "Reading blue card token",
        "Confirming client operations lane",
        "Opening blue systems"
      ]
    },
    Green: {
      title: "Green clearance handoff",
      subtitle: "Restricted support route confirmed.",
      steps: [
        "Reading green card route",
        "Confirming support systems lane",
        "Opening green systems"
      ]
    },
    Black: {
      title: "Black clearance handoff",
      subtitle: "Deep archive route confirmed.",
      steps: [
        "Reading black card voiceprint",
        "Confirming archive access lane",
        "Opening black systems"
      ]
    }
  };

  function getOverlay() {
    let overlay = document.querySelector(".bli-security-loader");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "bli-security-loader";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="bli-security-loader-card">
        <p class="bli-security-loader-kicker">Blacklight access checkpoint</p>
        <h2 class="bli-security-loader-title">Clearance handoff</h2>
        <p class="bli-security-loader-subtitle">Security route confirmed.</p>
        <div class="bli-security-loader-bar" aria-hidden="true"><span></span></div>
        <ol class="bli-security-loader-steps"></ol>
        <p class="bli-security-loader-status">Please stand by.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function populateOverlay(overlay, tierCopy) {
    overlay.querySelector(".bli-security-loader-title").textContent = tierCopy.title;
    overlay.querySelector(".bli-security-loader-subtitle").textContent = tierCopy.subtitle;
    overlay.querySelector(".bli-security-loader-status").textContent = "Please stand by.";

    const list = overlay.querySelector(".bli-security-loader-steps");
    list.replaceChildren();
    tierCopy.steps.forEach((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      list.appendChild(item);
    });
  }

  function runCheckpoint(event) {
    const trigger = event.currentTarget;
    const target = trigger.dataset.securityTarget || trigger.getAttribute("href");
    if (!target) return;

    event.preventDefault();

    if (trigger.dataset.loading === "true") return;
    trigger.dataset.loading = "true";
    trigger.setAttribute("aria-disabled", "true");

    const tier = trigger.dataset.securityTier || "White";
    const tierCopy = copy[tier] || copy.White;
    const overlay = getOverlay();
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = prefersReducedMotion ? REDUCED_MOTION_DELAY : STEP_DELAY;

    populateOverlay(overlay, tierCopy);
    document.body.classList.add("bli-security-loading-active");
    overlay.setAttribute("aria-hidden", "false");

    requestAnimationFrame(() => overlay.classList.add("is-active"));

    const status = overlay.querySelector(".bli-security-loader-status");
    const stepItems = Array.from(overlay.querySelectorAll(".bli-security-loader-steps li"));

    stepItems.forEach((item, index) => {
      window.setTimeout(() => {
        item.classList.add("is-complete");
        status.textContent = item.textContent + ".";
      }, delay * (index + 1));
    });

    window.setTimeout(() => {
      status.textContent = "Transfer accepted. Redirecting.";
      window.location.assign(target);
    }, delay * (stepItems.length + 1));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-security-target]").forEach((trigger) => {
      trigger.addEventListener("click", runCheckpoint);
    });
  });
})();
