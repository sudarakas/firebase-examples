import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  limit,
  startAfter,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const conversationSelect = document.getElementById('conversationId');
const statusDiv = document.getElementById('status');

let app, db, unsubscribe;
let currentConversationId = conversationSelect.value;
let allMessages = [];
let oldestMessage = null;
let isLoadingMore = false;

function updateStatus(message, type = '') {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  updateStatus('Connected to Firebase', 'connected');
} catch (error) {
  updateStatus('Firebase Error: ' + error.message, 'error');
  console.error('Firebase initialization error:', error);
}

function subscribeToMessages(conversationId) {
  if (unsubscribe) {
    unsubscribe();
  }

  allMessages = [];
  oldestMessage = null;

  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'desc'),
    limit(2)
  );

  unsubscribe = onSnapshot(q, 
    (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      
      if (msgs.length > 0) {
        oldestMessage = snapshot.docs[snapshot.docs.length - 1];
      }
      
      allMessages = msgs.reverse();
      displayMessages(allMessages);
    },
    (error) => {
      updateStatus('Error loading messages: ' + error.message, 'error');
      console.error('Snapshot error:', error);
    }
  );
}

async function loadMoreMessages() {
  if (!oldestMessage || isLoadingMore) return;
  
  isLoadingMore = true;
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
  }

  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', currentConversationId),
      orderBy('createdAt', 'desc'),
      startAfter(oldestMessage),
      limit(20)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      updateStatus('No more messages', '');
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    } else {
      const olderMsgs = [];
      snapshot.forEach((doc) => {
        olderMsgs.push({ id: doc.id, ...doc.data() });
      });
      
      oldestMessage = snapshot.docs[snapshot.docs.length - 1];
      allMessages = [...olderMsgs.reverse(), ...allMessages];
      
      const scrollHeight = messagesDiv.scrollHeight;
      displayMessages(allMessages);
      messagesDiv.scrollTop = messagesDiv.scrollHeight - scrollHeight;
    }
  } catch (error) {
    updateStatus('Error loading more: ' + error.message, 'error');
    console.error('Load more error:', error);
  } finally {
    isLoadingMore = false;
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load Older Messages';
    }
  }
}

function displayMessages(messages) {
  const hadLoadMoreBtn = !!document.getElementById('loadMoreBtn');
  
  messagesDiv.innerHTML = '';
  
  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.id = 'loadMoreBtn';
  loadMoreBtn.className = 'load-more-btn';
  loadMoreBtn.textContent = 'Load Older Messages';
  loadMoreBtn.onclick = loadMoreMessages;
  messagesDiv.appendChild(loadMoreBtn);
  
  messages.forEach(msg => {
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    
    const time = msg.createdAt ? 
      new Date(msg.createdAt.seconds * 1000).toLocaleTimeString() : 
      'Just now';
    
    messageEl.innerHTML = `
      <div class="message-content">
        <div class="message-text">${escapeHtml(msg.text)}</div>
        <div class="message-time">${time}</div>
      </div>
    `;
    
    messagesDiv.appendChild(messageEl);
  });
  
  if (!hadLoadMoreBtn) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

async function sendMessage() {
  const text = messageInput.value.trim();
  
  if (!text) return;
  
  try {
    const messagesRef = collection(db, 'messages');
    await addDoc(messagesRef, {
      text: text,
      conversationId: currentConversationId,
      createdAt: serverTimestamp()
    });
    
    messageInput.value = '';
    messageInput.focus();
  } catch (error) {
    updateStatus('Error sending message: ' + error.message, 'error');
    console.error('Send message error:', error);
  }
}

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

conversationSelect.addEventListener('change', (e) => {
  currentConversationId = e.target.value;
  allMessages = [];
  oldestMessage = null;
  subscribeToMessages(currentConversationId);
});

if (db) {
  subscribeToMessages(currentConversationId);
}
