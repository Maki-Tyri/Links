// app.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  orderBy
} from "firebase/firestore";

// Firebase config from user
const firebaseConfig = {
  apiKey: "AIzaSyBwNhm5g7zdAP38KV9QwuvrSQkTCqvX5jM",
  authDomain: "budget-planner-051194.firebaseapp.com",
  projectId: "budget-planner-051194",
  storageBucket: "budget-planner-051194.firebasestorage.app",
  messagingSenderId: "4703789120",
  appId: "1:4703789120:web:feaba0cc4cd4972c9a7fa5",
  measurementId: "G-2QK9ZYTZRF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginDiv = document.getElementById("loginDiv");
const appDiv = document.getElementById("appDiv");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const loginMessage = document.getElementById("loginMessage");

const userNameDisplay = document.getElementById("userNameDisplay");
const logoutBtn = document.getElementById("logoutBtn");

const linkNameInput = document.getElementById("linkNameInput");
const linkURLInput = document.getElementById("linkURLInput");
const addLinkBtn = document.getElementById("addLinkBtn");
const addLinkMsg = document.getElementById("addLinkMsg");
const linksList = document.getElementById("linksList");

let currentUser = null;
let unsubscribeLinks = null;

// Helpers
function showMessage(elem, message, isError = false) {
  elem.textContent = message;
  elem.className = "message " + (isError ? "error" : "success");
}

function clearMessage(elem) {
  elem.textContent = "";
  elem.className = "message";
}

function validateLinkInputs() {
  const name = linkNameInput.value.trim();
  const url = linkURLInput.value.trim();
  if (name && url && /^https?:\/\/.+/.test(url)) {
    addLinkBtn.disabled = false;
  } else {
    addLinkBtn.disabled = true;
  }
}

function toggleUIForUser(user) {
  if (user) {
    currentUser = user;
    loginDiv.style.display = "none";
    appDiv.style.display = "block";
    userNameDisplay.textContent = user.email;

    // Load user links realtime
    if (unsubscribeLinks) unsubscribeLinks();
    const linksRef = collection(db, "links");
    const q = query(linksRef, where("uid", "==", user.uid), orderBy("createdAt", "desc"));
    unsubscribeLinks = onSnapshot(q, (querySnapshot) => {
      linksList.innerHTML = "";
      querySnapshot.forEach(docSnap => {
        const link = docSnap.data();
        const li = document.createElement("li");

        const a = document.createElement("a");
        a.href = link.url;
        a.textContent = link.name;
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.onclick = async () => {
          try {
            await deleteDoc(doc(db, "links", docSnap.id));
            showMessage(addLinkMsg, "Link deleted.", false);
          } catch (err) {
            showMessage(addLinkMsg, "Error deleting link: " + err.message, true);
          }
        };

        li.appendChild(a);
        li.appendChild(delBtn);
        linksList.appendChild(li);
      });
      if (querySnapshot.empty) {
        const emptyMsg = document.createElement("p");
        emptyMsg.textContent = "No links yet.";
        emptyMsg.style.textAlign = "center";
        emptyMsg.style.color = "#999";
        linksList.appendChild(emptyMsg);
      }
    });

  } else {
    currentUser = null;
    loginDiv.style.display = "block";
    appDiv.style.display = "none";
    userNameDisplay.textContent = "";
    if (unsubscribeLinks) {
      unsubscribeLinks();
      unsubscribeLinks = null;
    }
  }
}

// Event Listeners
loginBtn.addEventListener("click", async () => {
  clearMessage(loginMessage);
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage(loginMessage, "Please enter email and password.", true);
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    clearMessage(loginMessage);
  } catch (err) {
    showMessage(loginMessage, "Login failed: " + err.message, true);
  }
});

registerBtn.addEventListener("click", async () => {
  clearMessage(loginMessage);
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage(loginMessage, "Please enter email and password.", true);
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    clearMessage(loginMessage);
    showMessage(loginMessage, "Registration successful. You are now logged in.", false);
  } catch (err) {
    showMessage(loginMessage, "Registration failed: " + err.message, true);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    clearMessage(addLinkMsg);
    clearMessage(loginMessage);
    linkNameInput.value = "";
    linkURLInput.value = "";
    addLinkBtn.disabled = true;
  } catch (err) {
    showMessage(addLinkMsg, "Logout failed: " + err.message, true);
  }
});

linkNameInput.addEventListener("input", validateLinkInputs);
linkURLInput.addEventListener("input", validateLinkInputs);

addLinkBtn.addEventListener("click", async () => {
  clearMessage(addLinkMsg);
  if (!currentUser) {
    showMessage(addLinkMsg, "You must be logged in to add links.", true);
    return;
  }
  const name = linkNameInput.value.trim();
  const url = linkURLInput.value.trim();

  if (!name || !url || !/^https?:\/\/.+/.test(url)) {
    showMessage(addLinkMsg, "Please enter valid link name and URL starting with http(s).", true);
    return;
  }

  try {
    await addDoc(collection(db, "links"), {
      uid: currentUser.uid,
      name,
      url,
      createdAt: new Date()
    });
    linkNameInput.value = "";
    linkURLInput.value = "";
    addLinkBtn.disabled = true;
    showMessage(addLinkMsg, "Link added successfully.", false);
  } catch (err) {
    showMessage(addLinkMsg, "Error adding link: " + err.message, true);
  }
});

// Auth state observer
onAuthStateChanged(auth, (user) => {
  toggleUIForUser(user);
});
