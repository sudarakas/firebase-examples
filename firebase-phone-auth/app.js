/**
 * Firebase Phone Authentication Application
 * Handles phone number verification and user authentication using Firebase Auth
 */

// Configuration constants
const BACKEND_URL = "http://localhost:3030/api/";

// Firebase client configuration
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
};

// Global state variables
let auth;
let confirmationResult = null;
let recaptchaVerifier = null;
let recaptchaWidgetId = null;

/**
 * Initialize Firebase application
 */
function initializeFirebase() {
  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization error:", error);
    showMessage("Firebase initialization failed. Check your config.", "error");
  }
}

/**
 * Initialize reCAPTCHA verifier for phone authentication
 */
function initializeRecaptcha() {
  if (recaptchaVerifier) {
    console.log("reCAPTCHA already initialized");
    return;
  }

  try {
    console.log("Initializing reCAPTCHA...");

    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      "recaptcha-container",
      {
        size: "normal",
        callback: (response) => {
          console.log("reCAPTCHA solved successfully");
          document.getElementById("send-code-btn").disabled = false;
        },
        "expired-callback": () => {
          console.warn("reCAPTCHA expired");
          showMessage("reCAPTCHA expired. Please solve it again.", "warning");
          document.getElementById("send-code-btn").disabled = true;
        },
      }
    );

    recaptchaVerifier
      .render()
      .then((widgetId) => {
        recaptchaWidgetId = widgetId;
        console.log("reCAPTCHA rendered successfully");
      })
      .catch((error) => {
        console.error("reCAPTCHA render error:", error);
        showMessage(
          "Failed to load reCAPTCHA. Please refresh the page.",
          "error"
        );
      });
  } catch (error) {
    console.error("reCAPTCHA initialization error:", error);
    showMessage("Failed to initialize reCAPTCHA: " + error.message, "error");
  }
}

/**
 * Initialize application on page load
 */
window.onload = () => {
  console.log("Page loaded, initializing...");

  if (firebaseConfig.apiKey === "") {
    showMessage("Please configure your Firebase credentials!", "error");
    document.getElementById("send-code-btn").disabled = true;
    return;
  }

  initializeFirebase();

  setTimeout(() => {
    initializeRecaptcha();
  }, 500);

  checkAuthState();
};

/**
 * Send verification code to provided phone number
 */
async function sendVerificationCode() {
  const phoneNumber = document.getElementById("phone-number").value.trim();
  const sendBtn = document.getElementById("send-code-btn");

  // Validate phone number format
  if (!phoneNumber || phoneNumber.length < 8) {
    showMessage("Please enter a valid phone number with country code", "error");
    return;
  }

  if (!phoneNumber.startsWith("+")) {
    showMessage(
      "Phone number must start with + and include country code",
      "error"
    );
    return;
  }

  try {
    sendBtn.disabled = true;
    sendBtn.innerHTML = 'Sending Code... <span class="loading"></span>';

    console.log("Sending verification code to:", phoneNumber);

    confirmationResult = await auth.signInWithPhoneNumber(
      phoneNumber,
      recaptchaVerifier
    );

    console.log("Verification code sent successfully");
    showMessage("Verification code sent! Check your phone.", "success");

    // Switch to verification code input view
    document.getElementById("phone-section").classList.add("hidden");
    document.getElementById("verify-section").classList.remove("hidden");
    document.getElementById("verification-code").focus();
  } catch (error) {
    console.error("Error sending verification code:", error);
    handleAuthError(error);

    sendBtn.disabled = false;
    sendBtn.textContent = "Send Verification Code";

    // Reset reCAPTCHA on error
    if (recaptchaWidgetId !== null && window.grecaptcha) {
      try {
        window.grecaptcha.reset(recaptchaWidgetId);
      } catch (e) {
        resetRecaptcha();
      }
    }
  }
}

/**
 * Verify the SMS code and complete sign-in
 */
async function verifyCode() {
  const code = document.getElementById("verification-code").value.trim();
  const verifyBtn = document.getElementById("verify-btn");

  // Validate verification code
  if (!code || code.length !== 6) {
    showMessage(
      "Please enter the complete 6-digit verification code",
      "error"
    );
    return;
  }

  if (!confirmationResult) {
    showMessage("Please request a verification code first", "error");
    resetForm();
    return;
  }

  try {
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = 'Verifying... <span class="loading"></span>';

    console.log("Verifying code...");

    const result = await confirmationResult.confirm(code);
    const user = result.user;

    console.log("User signed in successfully:", user.uid);
    showMessage("Successfully signed in!", "success");

    displayUserInfo(user);
  } catch (error) {
    console.error("Error verifying code:", error);
    handleAuthError(error);

    verifyBtn.disabled = false;
    verifyBtn.textContent = "Verify & Sign In";
  }
}

/**
 * Send ID token to backend for server-side verification
 */
async function verifyWithBackend() {
  const user = auth.currentUser;

  if (!user) {
    showMessage("No user signed in", "error");
    return;
  }

  try {
    showMessage("Verifying token with backend...", "info");

    const idToken = await user.getIdToken(true);

    // Debug token information
    if (idToken) {
      console.log("Token length:", idToken.length);
      console.log("Token starts with:", idToken.substring(0, 20));
      console.log("Token structure:", idToken.split(".").length);
    }

    // Send token to backend API
    const response = await fetch(`${BACKEND_URL}/verify-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();

    // Display backend verification result
    document
      .getElementById("backend-verification")
      .classList.remove("hidden");
    document.getElementById("backend-response").textContent = JSON.stringify(
      data,
      null,
      2
    );

    if (data.success) {
      showMessage("Token verified successfully by backend!", "success");
      console.log("Backend verification result:", data);
    } else {
      showMessage("Backend verification failed: " + data.error, "error");
    }
  } catch (error) {
    console.error("Error verifying with backend:", error);
    showMessage("Error connecting to backend: " + error.message, "error");
    document.getElementById("backend-response").textContent =
      "Error: " + error.message;
  }
}

/**
 * Display authenticated user information
 * @param {Object} user - Firebase user object
 */
async function displayUserInfo(user) {
  document.getElementById("phone-section").classList.add("hidden");
  document.getElementById("verify-section").classList.add("hidden");
  document.getElementById("user-section").classList.remove("hidden");
  document.getElementById("user-phone").textContent =
    user.phoneNumber || "N/A";
  document.getElementById("user-id").textContent = user.uid;

  await getAndDisplayToken(user);
}

/**
 * Retrieve and display Firebase ID token
 * @param {Object} user - Firebase user object
 */
async function getAndDisplayToken(user) {
  try {
    const idToken = await user.getIdToken();
    document.getElementById("id-token").value = idToken;
    console.log("ID Token retrieved successfully");
  } catch (error) {
    console.error("Error getting ID token:", error);
    document.getElementById("id-token").value =
      "Error getting token: " + error.message;
  }
}

/**
 * Copy ID token to clipboard
 */
async function copyToken() {
  const tokenField = document.getElementById("id-token");
  const token = tokenField.value;

  if (!token || token.startsWith("Error")) {
    showMessage("No valid token to copy", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(token);
    showMessage("Token copied to clipboard!", "success");
  } catch (error) {
    // Fallback for older browsers
    tokenField.select();
    document.execCommand("copy");
    showMessage("Token copied to clipboard!", "success");
  }
}

/**
 * Sign out current user
 */
async function signOut() {
  try {
    await auth.signOut();
    console.log("User signed out");
    resetForm();
    showMessage("Signed out successfully", "info");
  } catch (error) {
    console.error("Error signing out:", error);
    showMessage("Error signing out: " + error.message, "error");
  }
}

/**
 * Reset form to initial state
 */
function resetForm() {
  console.log("Resetting form...");

  // Show phone input section
  document.getElementById("phone-section").classList.remove("hidden");
  document.getElementById("verify-section").classList.add("hidden");
  document.getElementById("user-section").classList.add("hidden");
  document.getElementById("backend-verification").classList.add("hidden");

  // Clear input fields
  document.getElementById("verification-code").value = "";

  // Reset button states
  const sendBtn = document.getElementById("send-code-btn");
  const verifyBtn = document.getElementById("verify-btn");
  sendBtn.disabled = false;
  sendBtn.textContent = "Send Verification Code";
  verifyBtn.disabled = false;
  verifyBtn.textContent = "Verify & Sign In";

  // Clear confirmation result
  confirmationResult = null;
  resetRecaptcha();
}

/**
 * Reset and reinitialize reCAPTCHA
 */
function resetRecaptcha() {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
      recaptchaWidgetId = null;
    } catch (e) {
      console.error("Error clearing reCAPTCHA:", e);
    }
  }

  setTimeout(() => {
    initializeRecaptcha();
  }, 500);
}

/**
 * Monitor authentication state changes
 */
function checkAuthState() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log("User already signed in:", user.uid);
      await displayUserInfo(user);
    }
  });
}

/**
 * Handle Firebase authentication errors
 * @param {Object} error - Firebase error object
 */
function handleAuthError(error) {
  let message = "An error occurred: " + error.message;

  switch (error.code) {
    case "auth/invalid-phone-number":
      message = "Invalid phone number format";
      break;
    case "auth/invalid-verification-code":
      message = "Invalid verification code";
      break;
    case "auth/code-expired":
      message = "Code expired. Request a new one";
      break;
    case "auth/too-many-requests":
      message = "Too many attempts. Wait before trying again";
      break;
  }

  showMessage(message, "error");
}

/**
 * Display message to user
 * @param {string} text - Message text
 * @param {string} type - Message type (info, success, error, warning)
 */
function showMessage(text, type = "info") {
  const messageDiv = document.getElementById("message");
  messageDiv.className = "message " + type;
  messageDiv.textContent = text;
  messageDiv.style.display = "block";

  // Auto-hide non-error messages
  if (type !== "error") {
    setTimeout(() => {
      messageDiv.style.display = "none";
    }, 8000);
  }
}

/**
 * Add keyboard event listeners
 */
document.addEventListener("DOMContentLoaded", () => {
  // Allow Enter key to send verification code
  document
    .getElementById("phone-number")
    ?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendVerificationCode();
    });

  // Allow Enter key to verify code
  document
    .getElementById("verification-code")
    ?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") verifyCode();
    });
});
