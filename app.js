import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Your Firebase config (fix storageBucket typo: .appspot.com)
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
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const loginPage = document.getElementById('login-page');
const chatHeadsContainer = document.getElementById('chat-heads-container');
const chatWindow = document.getElementById('chat-window');
const messagesDiv = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
const mediaInput = document.getElementById('media-input');
const sendBtn = document.getElementById('send-btn');

const phoneNumberInput = document.getElementById('phone-number');
const sendCodeBtn = document.getElementById('send-code-btn');
const verificationCodeInput = document.getElementById('verification-code');
const verifyCodeBtn = document.getElementById('verify-code-btn');

let currentUser = null;
let unsubscribeMessages = null;

window.onload = () => {
  window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
    size: 'invisible',
    callback: (response) => {
      // reCAPTCHA solved, allow sign in
      console.log("reCAPTCHA solved");
    }
  }, auth);

  sendCodeBtn.onclick = () => {
    const phoneNumber = phoneNumberInput.value.trim();
    if (!phoneNumber) {
      alert('Please enter a phone number');
      return;
    }
    const appVerifier = window.recaptchaVerifier;
    signInWithPhoneNumber(auth, phoneNumber, appVerifier)
      .then(confirmationResult => {
        window.confirmationResult = confirmationResult;
        alert('Verification code sent!');
        verificationCodeInput.style.display = 'block';
        verifyCodeBtn.style.display = 'block';
      })
      .catch(error => {
        alert('Error sending code: ' + error.message);
      });
  };

  verifyCodeBtn.onclick = () => {
    const code = verificationCodeInput.value.trim();
    if (!code) {
      alert('Please enter verification code');
      return;
    }
    window.confirmationResult.confirm(code)
      .then(result => {
        currentUser = result.user;
        alert('Login successful! Welcome ' + currentUser.phoneNumber);
        showChatUI(currentUser);
      })
      .catch(error => {
        alert('Incorrect code: ' + error.message);
      });
  };

  onAuthStateChanged(auth, user => {
    if (user) {
      currentUser = user;
      showChatUI(user);
    } else {
      // User logged out or not logged in
      loginPage.style.display = 'block';
      chatHeadsContainer.style.display = 'none';
      chatWindow.style.display = 'none';
      if (unsubscribeMessages) unsubscribeMessages();
    }
  });
};

function showChatUI(user) {
  loginPage.style.display = 'none';
  chatHeadsContainer.style.display = 'block';
  chatWindow.style.display = 'none';

  chatHeadsContainer.innerHTML = '';
  // For simplicity, one chat head: user self
  const chatHead = document.createElement('button');
  chatHead.textContent = user.phoneNumber;
  chatHead.title = 'Open chat';
  chatHead.onclick = () => {
    chatWindow.style.display = 'block';
    loadMessages();
  };
  chatHeadsContainer.appendChild(chatHead);

  sendBtn.onclick = async () => {
    const text = chatInput.value.trim();
    const file = mediaInput.files[0] || null;

    if (!text && !file) {
      alert('Enter message or select a file');
      return;
    }

    sendBtn.disabled = true;

    try {
      await sendMessage(user, text, file);
      chatInput.value = '';
      mediaInput.value = null;
    } catch (error) {
      alert('Error sending message: ' + error.message);
    } finally {
      sendBtn.disabled = false;
    }
  };
}

async function sendMessage(user, text, file) {
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

  // If text is a link (http/https), mark it as text but user can click on it in UI
  await addDoc(collection(db, 'messages'), {
    senderId: user.uid,
    senderPhone: user.phoneNumber,
    text: text || null,
    mediaUrl,
    mediaType,
    timestamp: serverTimestamp()
  });
}

function loadMessages() {
  if (unsubscribeMessages) unsubscribeMessages();

  const messagesQuery = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));

  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const m = doc.data();
      const div = document.createElement('div');
      div.classList.add(m.senderId === currentUser.uid ? 'self' : 'other');

      // Display text with clickable links
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

      // Media display
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
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

function isValidHttpUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}
