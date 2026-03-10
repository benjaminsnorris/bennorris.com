(function () {
  var PASSWORD = "Sneak peek to my books.";
  var STORAGE_KEY = "book-access-granted";

  function isAuthenticated() {
    return localStorage.getItem(STORAGE_KEY) === PASSWORD;
  }

  function showGate() {
    var container = document.getElementById("book-gate");
    container.innerHTML =
      '<div class="gate-box">' +
      "<h2>This book is password-protected</h2>" +
      "<p>Enter the password to continue reading.</p>" +
      '<form id="gate-form">' +
      '<input type="password" id="gate-password" placeholder="Password" autocomplete="off" />' +
      '<button type="submit" class="gate-btn">Submit</button>' +
      '<p id="gate-error" style="display:none;color:#c0392b;margin-top:0.5em;">Incorrect password.</p>' +
      "</form>" +
      "</div>";

    document.getElementById("gate-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("gate-password").value;
      if (input === PASSWORD) {
        localStorage.setItem(STORAGE_KEY, PASSWORD);
        loadContent();
      } else {
        document.getElementById("gate-error").style.display = "block";
      }
    });
  }

  function loadContent() {
    var container = document.getElementById("book-gate");
    var contentPath = container.getAttribute("data-content");
    window.location.href = contentPath;
  }

  if (isAuthenticated()) {
    loadContent();
  } else {
    showGate();
  }
})();
