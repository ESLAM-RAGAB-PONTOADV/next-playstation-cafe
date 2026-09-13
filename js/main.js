(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const form = $("#bookingForm");
  const activity = $("#activity");
  const consoleField = $("#consoleField");
  const consoleSelect = $("#console");
  const dateInput = $("#bookingDate");
  const timeSelect = $("#bookingTime");
  const modal = $("#bookingModal");
  const summaryEl = $("#bookingSummary");
  const sendAhmed = $("#sendAhmed");
  const sendMohamed = $("#sendMohamed");
  const formError = $("#formError");
  const toast = $("#toast");
  let currentMessage = "";

  // Current year
  $("#year").textContent = new Date().getFullYear();

  // Minimum booking date = today
  const now = new Date();
  const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().split("T")[0];
  dateInput.min = localToday;

  // Booking hours: 1 PM -> 4 AM start times
  const times = [
    ["13:00","1:00 ظهرًا"], ["14:00","2:00 ظهرًا"], ["15:00","3:00 عصرًا"],
    ["16:00","4:00 عصرًا"], ["17:00","5:00 مساءً"], ["18:00","6:00 مساءً"],
    ["19:00","7:00 مساءً"], ["20:00","8:00 مساءً"], ["21:00","9:00 مساءً"],
    ["22:00","10:00 مساءً"], ["23:00","11:00 مساءً"], ["00:00","12:00 منتصف الليل"],
    ["01:00","1:00 صباحًا"], ["02:00","2:00 صباحًا"], ["03:00","3:00 صباحًا"],
    ["04:00","4:00 صباحًا"]
  ];
  times.forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    timeSelect.append(opt);
  });

  activity.addEventListener("change", () => {
    const isPS = activity.value.includes("PlayStation");
    consoleField.classList.toggle("is-hidden", !isPS);
    consoleSelect.required = isPS;
    if (!isPS) consoleSelect.value = "";
  });

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function formatDate(iso) {
    if (!iso) return "";
    const [y,m,d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function timeLabel(value) {
    return times.find(t => t[0] === value)?.[1] || value;
  }

  function endTimeValid(start, hours) {
    if (!start || !hours) return true;
    let [h, m] = start.split(":").map(Number);
    // Convert opening-cycle time to minutes from 1 PM.
    if (h < 5) h += 24;
    const startMin = h * 60 + m;
    const endMin = startMin + Number(hours) * 60;
    return endMin <= 29 * 60; // 5 AM next day
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    formError.textContent = "";

    if (!form.checkValidity()) {
      formError.textContent = "كمّل البيانات المطلوبة الأول.";
      form.reportValidity();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    if (!endTimeValid(data.time, data.hours)) {
      formError.textContent = "المدة المختارة بتتجاوز ميعاد الإغلاق 5 صباحًا. قلّل عدد الساعات أو اختار وقت أبكر.";
      return;
    }

    const selectedDate = new Date(`${data.date}T12:00:00`);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (selectedDate < today) {
      formError.textContent = "اختار تاريخ من النهارده أو بعده.";
      return;
    }

    const consoleLine = data.console ? `\nنوع الجهاز: ${data.console}` : "";
    const notesLine = data.notes.trim() ? `\nملاحظات: ${data.notes.trim()}` : "";

    currentMessage =
`🎮 NEXT PlayStation & Cafe
طلب حجز جديد

الاسم: ${data.name}
رقم الموبايل: ${data.phone}
النشاط: ${data.activity}${consoleLine}
التاريخ: ${formatDate(data.date)}
وقت البداية: ${timeLabel(data.time)}
المدة: ${data.hours} ${Number(data.hours) === 1 ? "ساعة" : "ساعات"}
عدد الأشخاص: ${data.people}${notesLine}

برجاء تأكيد توفر الموعد وتفاصيل الحجز.`;

    summaryEl.textContent = currentMessage;
    const encoded = encodeURIComponent(currentMessage);
    sendAhmed.href = `https://wa.me/201026275966?text=${encoded}`;
    sendMohamed.href = `https://wa.me/201110145386?text=${encoded}`;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    $(".modal-close").focus();
  });

  function closeModal() {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  $$("[data-close-modal]").forEach(el => el.addEventListener("click", closeModal));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("show")) closeModal();
  });

  $("#copyBooking").addEventListener("click", async () => {
    if (!currentMessage) return;
    try {
      await navigator.clipboard.writeText(currentMessage);
      showToast("تم نسخ تفاصيل الحجز");
    } catch {
      showToast("تعذر النسخ تلقائيًا");
    }
  });

  $("#copyAddress").addEventListener("click", async () => {
    const address = "الشارع الجديد - شارع أبراج المدينة المنورة - أسفل مستشفى دار الحياة";
    try {
      await navigator.clipboard.writeText(address);
      showToast("تم نسخ العنوان");
    } catch {
      showToast(address);
    }
  });

  // Highlight current section in top nav
  const navLinks = $$(".quick-nav a");
  const sectionIds = navLinks.map(a => a.getAttribute("href")).filter(h => h?.startsWith("#"));
  const sections = sectionIds.map(id => $(id)).filter(Boolean);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { rootMargin: "-30% 0px -60% 0px", threshold: 0.01 });

  sections.forEach(section => observer.observe(section));

  // Mobile contact chooser
  const contactChoiceModal = $("#contactChoiceModal");
  const choiceAhmed = $("#choiceAhmed");
  const choiceMohamed = $("#choiceMohamed");

  function openContactChoice(type) {
    const isWhatsApp = type === "whatsapp";

    if (isWhatsApp) {
      choiceAhmed.setAttribute("aria-label", "واتساب أحمد علاء");
      choiceMohamed.setAttribute("aria-label", "واتساب محمد علاء");
      choiceAhmed.href = "https://wa.me/201026275966";
      choiceMohamed.href = "https://wa.me/201110145386";
      choiceAhmed.target = "_blank";
      choiceMohamed.target = "_blank";
      choiceAhmed.rel = "noopener";
      choiceMohamed.rel = "noopener";
    } else {
      choiceAhmed.setAttribute("aria-label", "اتصال بأحمد علاء");
      choiceMohamed.setAttribute("aria-label", "اتصال بمحمد علاء");
      choiceAhmed.href = "tel:+201026275966";
      choiceMohamed.href = "tel:+201110145386";
      choiceAhmed.removeAttribute("target");
      choiceMohamed.removeAttribute("target");
      choiceAhmed.removeAttribute("rel");
      choiceMohamed.removeAttribute("rel");
    }

    contactChoiceModal.classList.add("show");
    contactChoiceModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    $(".contact-choice-close").focus();
  }

  function closeContactChoice() {
    contactChoiceModal.classList.remove("show");
    contactChoiceModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  $$("[data-contact-choice]").forEach(button => {
    button.addEventListener("click", () => openContactChoice(button.dataset.contactChoice));
  });

  $$("[data-close-contact-choice]").forEach(el => {
    el.addEventListener("click", closeContactChoice);
  });

  [choiceAhmed, choiceMohamed].forEach(link => {
    link.addEventListener("click", () => setTimeout(closeContactChoice, 120));
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && contactChoiceModal.classList.contains("show")) {
      closeContactChoice();
    }
  });

})();
