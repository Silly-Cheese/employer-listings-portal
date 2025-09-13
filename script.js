
// Employer Listings Portal - Firebase starter (client-side)
// IMPORTANT: Paste your Firebase config into firebaseConfig below.
// Then host these files (GitHub Pages) and follow README to set up Firestore and Auth.

// ---- Firebase config (replace with your project's config) ----
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAaAv7u5677_eU7Kcn_5YheDEedPIM5z_8",
  authDomain: "employer-listings-portal.firebaseapp.com",
  projectId: "employer-listings-portal",
  storageBucket: "employer-listings-portal.firebasestorage.app",
  messagingSenderId: "143333191257",
  appId: "1:143333191257:web:359edfdcf916397cda8b48"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// --------------------------------------------------------------

// Dynamic import of Firebase compat libraries (works on static hosting)
(async function(){
  try{
    await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js');
    await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
    const firebase = window.firebase;
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase connected:", firebase.apps.length);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Elements (may not exist on every page)
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const userBadge = document.getElementById('userBadge') || { textContent: '' };
    const listingsTableBody = document.getElementById('listingsTableBody');
    const addListingForm = document.getElementById('addListingForm');

    let currentUser = null;
    let isLeadership = false;

    // Observe auth state
    auth.onAuthStateChanged(async user => {
      currentUser = user;
      if(user){
        userBadge.textContent = user.email || user.uid;
        // ensure profile doc
        await db.collection('users').doc(user.uid).set({lastSeen: firebase.firestore.FieldValue.serverTimestamp()}, {merge:true});
        // check leadership via custom claim
        try{
          const token = await user.getIdTokenResult();
          if(token.claims && token.claims.isLeadership) isLeadership = true;
        }catch(e){ console.warn('Token check failed', e); }
        // fallback: check leadership collection
        if(!isLeadership){
          const doc = await db.collection('leadership').doc(user.uid).get();
          if(doc.exists && doc.data().isLeadership === true) isLeadership = true;
        }
        // load listings where applicable
        if(document.body.dataset.page === 'dashboard') loadUserListings();
        if(document.body.dataset.page === 'leadership' && isLeadership) loadAllListings();
      } else {
        userBadge.textContent = 'Not logged in';
      }
    });

    // Signup
    if(signupForm){
      signupForm.addEventListener('submit', async e=>{
        e.preventDefault();
        const email = signupForm.email.value.trim();
        const password = signupForm.password.value;
        const roblox = signupForm.roblox.value.trim();
        const discord = signupForm.discord.value.trim();
        const discordId = signupForm.discordId.value.trim();
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const uid = cred.user.uid;
        await db.collection('users').doc(uid).set({email, roblox, discord, discordId, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
        alert('Signup complete and logged in.');
      });
    }

    // Login
    if(loginForm){
      loginForm.addEventListener('submit', async e=>{
        e.preventDefault();
        const email = loginForm.email.value.trim();
        const password = loginForm.password.value;
        await auth.signInWithEmailAndPassword(email, password);
        alert('Signed in');
      });
    }

    // Logout
    if(logoutBtn) logoutBtn.addEventListener('click', ()=> auth.signOut());

    // Add Listing
    if(addListingForm){
      addListingForm.addEventListener('submit', async e=>{
        e.preventDefault();
        if(!currentUser){ alert('Please sign in'); return; }
        const data = {
          uid: currentUser.uid,
          ownerEmail: currentUser.email || null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          robloxUsername: addListingForm.robloxUsername.value.trim(),
          discordUsername: addListingForm.discordUsername.value.trim(),
          discordId: addListingForm.discordId.value.trim(),
          role: addListingForm.role.value.trim(),
          discordGroupLink: addListingForm.discordGroupLink.value.trim(),
          robloxGroupLink: addListingForm.robloxGroupLink.value.trim(),
          companyName: addListingForm.companyName.value.trim(),
          positionHiringFor: addListingForm.positionHiringFor.value.trim(),
          positionRequirements: addListingForm.positionRequirements.value.trim(),
          additionalNotes: addListingForm.additionalNotes.value.trim() || ''
        };
        await db.collection('listings').add(data);
        alert('Listing added.');
        addListingForm.reset();
        loadUserListings();
      });
    }

    // Load user listings
    async function loadUserListings(){
      if(!currentUser) return;
      if(!listingsTableBody) return;
      listingsTableBody.innerHTML = '';
      const snap = await db.collection('listings').where('uid','==',currentUser.uid).orderBy('createdAt','desc').get();
      snap.forEach(doc=>{
        const l = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(l.companyName||'')}</td>
          <td>${escapeHtml(l.positionHiringFor||'')}</td>
          <td>${escapeHtml(l.role||'')}</td>
          <td>${escapeHtml(l.robloxUsername||'')}</td>
          <td class="actions">
            <button class="btn" data-edit="${doc.id}">Edit</button>
            <button class="btn ghost" data-delete="${doc.id}">Delete</button>
          </td>
        `;
        listingsTableBody.appendChild(tr);
      });
      // attach listeners for edit/delete
      document.querySelectorAll('[data-delete]').forEach(b=> b.addEventListener('click', async e=>{
        const id = e.currentTarget.getAttribute('data-delete');
        if(confirm('Delete this listing?')){ await db.collection('listings').doc(id).delete(); loadUserListings(); }
      }));
      document.querySelectorAll('[data-edit]').forEach(b=> b.addEventListener('click', async e=>{
        const id = e.currentTarget.getAttribute('data-edit');
        const doc = await db.collection('listings').doc(id).get();
        const data = doc.data();
        populateEditForm(id, data);
      }));
    }

    // Populate edit form
    function populateEditForm(id, data){
      const fields = ['companyName','positionHiringFor','positionRequirements','role','robloxUsername','discordUsername','discordId','discordGroupLink','robloxGroupLink','additionalNotes'];
      fields.forEach(f=>{
        const input = addListingForm.querySelector(`[name="${f}"]`);
        if(input) input.value = data[f] || '';
      });
      addListingForm.dataset.editId = id;
      addListingForm.querySelector('button[type="submit"]').textContent = 'Update Listing';
      addListingForm.onsubmit = async function(e){
        e.preventDefault();
        const editId = addListingForm.dataset.editId;
        if(editId){
          const upd = {};
          fields.forEach(f=>{ const input = addListingForm.querySelector(`[name="${f}"]`); if(input) upd[f]=input.value.trim(); });
          upd.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('listings').doc(editId).update(upd);
          delete addListingForm.dataset.editId;
          addListingForm.querySelector('button[type="submit"]').textContent = 'Add Listing';
          addListingForm.reset();
          loadUserListings();
        }
      };
    }

    // Leadership: load all listings
    async function loadAllListings(){
      if(!listingsTableBody) return;
      listingsTableBody.innerHTML = '';
      const snap = await db.collection('listings').orderBy('createdAt','desc').get();
      snap.forEach(doc=>{
        const l = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(l.companyName||'')}</td>
          <td>${escapeHtml(l.positionHiringFor||'')}</td>
          <td>${escapeHtml(l.role||'')}</td>
          <td>${escapeHtml(l.robloxUsername||'')}</td>
          <td>${escapeHtml(l.discordUsername||'')}</td>
          <td>${escapeHtml(l.discordId||'')}</td>
          <td>${escapeHtml(l.ownerEmail||'')}</td>
          <td class="actions">
            <button class="btn" data-view="${doc.id}">View</button>
            <button class="btn ghost" data-delete="${doc.id}">Delete</button>
          </td>
        `;
        listingsTableBody.appendChild(tr);
      });
      document.querySelectorAll('[data-delete]').forEach(b=> b.addEventListener('click', async e=>{
        const id = e.currentTarget.getAttribute('data-delete');
        if(confirm('Delete listing?')){ await db.collection('listings').doc(id).delete(); loadAllListings(); }
      }));
    }

    function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  }catch(err){
    console.error('Firebase load/init error', err);
  }
})();
