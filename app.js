(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyCrCJntke2VQvZBU6p9bUdjiREPSdTbQ_c",
        authDomain: "note4all-app.firebaseapp.com",
        databaseURL: "https://note4all-app-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "note4all-app",
        storageBucket: "note4all-app.firebasestorage.app",
        messagingSenderId: "10839428261",
        appId: "1:10839428261:web:2fcd51dc9c053988d9d14c"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const notesRef = db.ref('notes');

    // Cached elements
    const noteNameEl = document.getElementById('noteName');
    const showListBtn = document.getElementById('showListBtn');
    const noteDropdown = document.getElementById('noteDropdown');
    const openBtn = document.getElementById('openBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const textarea = document.getElementById('noteContent');
    const inputContainer = document.querySelector('.input-container');

    let currentNoteRef = null;
    let saveTimeout = null;
    let saveHandler = null; // to remove previous handler when switching notes

    // Render dropdown items (sorted)
    function renderDropdown(notes) {
        noteDropdown.innerHTML = '';
        const names = Object.keys(notes || {});
        if (names.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'note-item';
            empty.textContent = 'No notes';
            empty.style.opacity = '0.6';
            noteDropdown.appendChild(empty);
            return;
        }
        names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        names.forEach((name) => {
            const item = document.createElement('div');
            item.className = 'note-item';
            item.textContent = name;
            item.tabIndex = 0;
            item.addEventListener('click', () => selectNote(name));
            item.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectNote(name); });
            noteDropdown.appendChild(item);
        });
    }

    // Listen for changes in the notes list
    notesRef.on('value', (snapshot) => {
        const notes = snapshot.val() || {};
        renderDropdown(notes);
        // Only schedule layout/position adjustment when the dropdown is visible
        if (noteDropdown.style.display !== 'none') requestAnimationFrame(adjustDropdownPosition);
    });

    // Position and size dropdown to avoid viewport clipping
    function adjustDropdownPosition() {
        if (noteDropdown.style.display === 'none') return;
        const rect = inputContainer.getBoundingClientRect();
        const margin = 8;
        const minHeight = 80;
        const availableBelow = Math.max(0, window.innerHeight - rect.bottom - margin);
        const availableAbove = Math.max(0, rect.top - margin);
        if (availableBelow >= Math.max(150, availableAbove)) {
            noteDropdown.style.top = '100%';
            noteDropdown.style.bottom = 'auto';
            noteDropdown.style.maxHeight = Math.max(minHeight, availableBelow) + 'px';
        } else {
            noteDropdown.style.top = 'auto';
            noteDropdown.style.bottom = '100%';
            noteDropdown.style.maxHeight = Math.max(minHeight, availableAbove) + 'px';
        }
    }

    // Toggle dropdown
    showListBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShown = noteDropdown.style.display === 'block';
        noteDropdown.style.display = isShown ? 'none' : 'block';
        if (!isShown) requestAnimationFrame(adjustDropdownPosition);
    });

    // Hide dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!inputContainer.contains(e.target)) noteDropdown.style.display = 'none';
    });

    window.addEventListener('resize', () => {
        if (noteDropdown.style.display !== 'none') requestAnimationFrame(adjustDropdownPosition);
    });
    // Use a passive scroll listener and only schedule rAF when dropdown is visible
    window.addEventListener('scroll', () => {
        if (noteDropdown.style.display !== 'none') requestAnimationFrame(adjustDropdownPosition);
    }, { passive: true, capture: true });

    // Select a note from the dropdown
    function selectNote(noteName) {
        noteNameEl.value = noteName;
        noteDropdown.style.display = 'none';
        loadNote(noteName);
    }

    // Open/create via enter or button
    noteNameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const name = noteNameEl.value.trim();
            if (!name) return alert('Please enter a note name.');
            loadNote(name);
        }
    });

    openBtn.addEventListener('click', () => {
        const name = noteNameEl.value.trim();
        if (!name) return alert('Please enter a note name.');
        loadNote(name);
    });

    // Load note and set up autosave (ensure we don't add duplicate listeners)
    function loadNote(noteName) {
        if (currentNoteRef) currentNoteRef.off();
        currentNoteRef = db.ref('notes/' + noteName);
        currentNoteRef.on('value', (snapshot) => {
            const content = snapshot.val() || '';
            if (document.activeElement !== textarea) textarea.value = content;
            deleteBtn.style.display = snapshot.exists() ? 'block' : 'none';
        });

        if (saveHandler) textarea.removeEventListener('input', saveHandler);
        saveHandler = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                if (currentNoteRef) currentNoteRef.set(textarea.value);
            }, 500);
        };
        textarea.addEventListener('input', saveHandler);
        deleteBtn.style.display = 'block';
    }

    // Delete note safely
    deleteBtn.addEventListener('click', () => {
        if (!currentNoteRef) return;
        if (!confirm('Are you sure you want to delete this note?'))
            return;
        currentNoteRef.remove().then(() => {
            textarea.value = '';
            noteNameEl.value = '';
            deleteBtn.style.display = 'none';
            currentNoteRef = null;
        }).catch((err) => {
            console.error('Failed to delete note:', err);
            alert('Failed to delete note. See console for details.');
        });
    });

})();