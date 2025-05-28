import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCy9CKJ6CELheBhw7Gs0BgsE1E0FsoYdgU",
  authDomain: "project-955237504610034331.firebaseapp.com",
  projectId: "project-955237504610034331",
  storageBucket: "project-955237504610034331.appspot.com",
  messagingSenderId: "76212939677",
  appId: "1:76212939677:web:ef498bc1e4e480ab6e5d74",
  measurementId: "G-WXBEP1LXTX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app');

const formTitle = document.getElementById('form-title');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const switchModeDiv = document.getElementById('switch-mode');

const chatHeadsContainer = document.getElementById('chat-heads-container');
const chatWindow = document.getElementById('chat-window');
const messagesDiv = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
const mediaInput = document.getElementById('media-input');
const sendBtn = document.getElementById('send-btn');

let isLoginMode = true;
let currentUser = null;
let unsubscribeMessages = null;
let activeChatUser = null; // for multi-chat extension, here self-chat only

// Use a fake domain for emails to match username
function usernameToEmail(username) {
  return username.trim().toLowerCase() + "@chatapp.fake";
}

// Check if username already exists in Firestore
async function isUsernameTaken(username) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username.toLowerCase()));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

// Register user
async function register(username, password) {
  if (!username || !password) {
    alert('Please enter username and password');
    return;
  }
  if (await isUsernameTaken(username)) {
    alert('Username already taken');
    return;
  }
  const email = usernameToEmail(username);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Save username in Firestore users collection
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      username: username.toLowerCase()
    });
    alert('Registration successful. You are now logged in.');
    currentUser = userCredential.user;
    afterLogin();
  } catch (error) {
    alert("Registration error: " + error.message);
  }
}

// Login user
async function login(username, password) {
  if (!username || !password) {
    alert('Please enter username and password');
    return;
  }
  const email = usernameToEmail(username);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    afterLogin();
  } catch (error) {
    alert("Login error: " + error.message);
  }
}

// After login UI setup
function afterLogin() {
  loginContainer.style.display = 'none';
  appContainer.style.display = 'flex';
  loadChatHeads();
}

// Load chat heads (for now just current user to self-chat)
function loadChatHeads() {
  chatHeadsContainer.innerHTML = '';

  // For demo, just one chat head: self
  getDoc(doc(db, 'users', currentUser.uid)).then(docSnap => {
    if (docSnap.exists()) {
      const userData = docSnap.data();
      const chatHead = document.createElement('div');
      chatHead.classList.add('chat-head', 'active');
      chatHead.textContent = userData.username.charAt(0).toUpperCase();
      chatHead.title = userData.username;
      chatHead.onclick = () => {
        openChatWith(userData);
      };
      chatHeadsContainer.appendChild(chatHead);
      openChatWith(userData);
    }
  });
}

function openChatWith(userData) {
  activeChatUser = userData;
  messagesDiv.innerHTML = '';
  if (unsubscribeMessages) unsubscribeMessages();

  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const m = doc.data();
      // Show only messages between current user and activeChatUser (self chat for now)
      if (m.senderId === currentUser.uid || m.receiverUsername === activeChatUser.username) {
        const div = document.createElement('div');
        div.classList.add('message');
        div.classList.add(m.senderId === currentUser.uid ? 'self' : 'other');

        if (m.text) {
          if (isValidHttpUrl(m.text)) {
            const a = document.createElement('a');
            a.href = m.text;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = m.text;
            div.appendChild(a);
          } else {
            div.textContent = m.text;
          }
        }

        if (m.mediaUrl) {
          if (m.mediaType === 'photo') {
            const img = document.createElement('img');
            img.src = m.mediaUrl;
            div.appendChild(img);
          } else if (m.mediaType === 'video') {
            const video = document.createElement('video');
            video.src = m.mediaUrl;
            video.controls = true;
            div.appendChild(video);
          } else if (m.mediaType === 'audio') {
            const audio = document.createElement('audio');
            audio.src = m.mediaUrl;
            audio.controls = true;
            div.appendChild(audio);
          }
        }

        messagesDiv.appendChild(div);
      }
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// Send message handler
sendBtn.onclick = async () => {
  const text = chatInput.value.trim();
  const file = mediaInput.files[0] || null;

  if (!text && !file) {
    alert('Enter message or select a file');
    return;
  }

  sendBtn.disabled = true;

  try {
    await sendMessage(text, file);
    chatInput.value = '';
    mediaInput.value = null;
  } catch (error) {
    alert('Error sending message: ' + error.message);
  } finally {
    sendBtn.disabled = false;
  }
};

// Send message function
async function sendMessage(text, file) {
  let mediaUrl = null;
  let mediaType = null;

  if (file) {
    const fileRef = ref(storage, 'chatMedia/' + Date.now() + '-' + file.name);
    await uploadBytes(fileRef, file);
    mediaUrl = await getDownloadURL(fileRef);

    if (file.type.startsWith('image/')) mediaType = 'photo';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';
  }

  await addDoc(collection(db, 'messages'), {
    senderId: currentUser.uid,
    senderUsername: activeChatUser.username,
    text: text || null,
    mediaUrl,
    mediaType,
    timestamp: serverTimestamp()
  });
}

// Utility: validate http/https url
function isValidHttpUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

// Switch login/register
switchModeDiv.onclick = () => {
  isLoginMode = !isLoginMode;
  formTitle.textContent = isLoginMode ? 'Login' : 'Register';
  submitBtn.textContent = isLoginMode ? 'Login' : 'Register';
  switchModeDiv.textContent = isLoginMode
    ? "Don't have an account? Register"
    : "Already have an account? Login";
};

// Submit button click
submitBtn.onclick = () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (isLoginMode) login(username, password);
  else register(username, password);
};

// Automatically logout on page load (for dev only, remove in prod)
auth.signOut();
