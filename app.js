import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, listAll, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBwNhm5g7zdAP38KV9QwuvrSQkTCqvX5jM",
  authDomain: "budget-planner-051194.firebaseapp.com",
  projectId: "budget-planner-051194",
  storageBucket: "budget-planner-051194.appspot.com",
  messagingSenderId: "4703789120",
  appId: "1:4703789120:web:feaba0cc4cd4972c9a7fa5",
  measurementId: "G-2QK9ZYTZRF"
};

// Init services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

// Elements
const email = document.getElementById("email");
const password = document.getElementById("password");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const uploadSection = document.getElementById("uploadSection");
const authSection = document.getElementById("authSection");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const fileList = document.getElementById("fileList");

// Auth Events
registerBtn.onclick = () => {
  createUserWithEmailAndPassword(auth, email.value, password.value)
    .then(() => alert("Registered and logged in"))
    .catch(err => alert(err.message));
};

loginBtn.onclick = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .then(() => alert("Logged in"))
    .catch(err => alert(err.message));
};

logoutBtn.onclick = () => {
  signOut(auth).then(() => alert("Logged out"));
};

// Auth state change
onAuthStateChanged(auth, user => {
  if (user) {
    uploadSection.style.display = "block";
    logoutBtn.style.display = "inline-block";
    loginBtn.style.display = registerBtn.style.display = "none";
    email.style.display = password.style.display = "none";
    listFiles(user.uid);
  } else {
    uploadSection.style.display = "none";
    logoutBtn.style.display = "none";
    loginBtn.style.display = registerBtn.style.display = "inline-block";
    email.style.display = password.style.display = "inline-block";
  }
});

// Upload File
uploadBtn.onclick = async () => {
  const file = fileInput.files[0];
  const user = auth.currentUser;
  if (!file || !user) return;

  const filePath = `${user.uid}/uploads/${file.name}`;
  const fileRef = ref(storage, filePath);
  await uploadBytes(fileRef, file);
  alert("Uploaded!");
  listFiles(user.uid);
};

// List Files
async function listFiles(userId) {
  fileList.innerHTML = "";
  const listRef = ref(storage, `${userId}/uploads/`);
  const res = await listAll(listRef);

  for (const itemRef of res.items) {
    const url = await getDownloadURL(itemRef);
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${itemRef.name}</strong><br>
      ${previewHTML(url)}
      <br><a href="${url}" target="_blank">Download</a>
      <button onclick="deleteFile('${itemRef.fullPath}')">Delete</button>
    `;
    fileList.appendChild(li);
  }
}

// Display preview (image/video)
function previewHTML(url) {
  if (url.match(/\.(jpeg|jpg|png|gif)$/i)) {
    return `<img src="${url}" />`;
  } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return `<video src="${url}" controls></video>`;
  }
  return "";
}

// Expose deleteFile globally
window.deleteFile = async function(path) {
  const fileRef = ref(storage, path);
  if (confirm("Delete this file?")) {
    await deleteObject(fileRef);
    alert("Deleted!");
    listFiles(auth.currentUser.uid);
  }
}
