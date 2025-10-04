const initApp = async () => {
    let db = null;
    const DB_NAME = 'AlumniDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'alumni_records';
    let lastUpdate = new Date();

    // --- UI Elements ---
    const userIdDisplay = document.getElementById('user-id-display');
    const totalAlumniMetric = document.getElementById('metric-total-alumni');
    const mentorsMetric = document.getElementById('metric-mentors');
    const readyTimeMetric = document.getElementById('metric-ready-time');
    const alumniTableBody = document.getElementById('alumni-table-body');
    const emptyState = document.getElementById('empty-state');
    const addAlumniButtons = [
        document.getElementById('add-alumni-btn'),
        document.getElementById('empty-add-alumni'),
    ].filter(Boolean);
    const alumniModal = document.getElementById('add-alumni-modal');
    const modalContent = document.getElementById('modal-content');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const newAlumniForm = document.getElementById('new-alumni-form');
    const modalMessage = document.getElementById('modal-message');
    const submitAlumniBtn = document.getElementById('submit-alumni-btn');
    
    // --- Sidebar Elements ---
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mainContent = document.getElementById('main-content');

    // --- INDEXEDDB WRAPPER ---
    
    /** Opens the IndexedDB connection. */
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const dbInstance = event.target.result;
                // Create the object store if it doesn't exist
                if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                    // 'id' is generated automatically
                    const store = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    // Create indexes for efficient searching (e.g., mentors, grad year)
                    store.createIndex('isMentor', 'isMentor', { unique: false });
                    store.createIndex('gradYear', 'gradYear', { unique: false });
                    console.log(`IndexedDB: Object Store '${STORE_NAME}' created.`);
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject('IndexedDB error: ' + event.target.errorCode);
        });
    }

    /** Gets a transaction object for the object store. */
    function getStore(mode = 'readonly') {
        const transaction = db.transaction([STORE_NAME], mode);
        return transaction.objectStore(STORE_NAME);
    }
    
    // --- INDEXEDDB CRUD OPERATIONS ---

    async function addAlumnus(record) {
        return new Promise((resolve, reject) => {
            const store = getStore('readwrite');
            record.lastUpdate = Date.now();
            record.isMentor = record.isMentor ? 1 : 0; // Store boolean as 1/0 for consistency

            const request = store.add(record);
            
            request.onsuccess = (event) => {
                resolve(event.target.result); // Returns the generated ID
            };
            request.onerror = (event) => {
                reject(new Error(`Failed to add record: ${event.target.error}`));
            };
        });
    }

    async function getAllAlumni() {
        return new Promise((resolve, reject) => {
            const store = getStore('readonly');
            const request = store.getAll();

            request.onsuccess = (event) => {
                // Sort the results manually by lastUpdate descending, as IndexedDB queries cannot order directly
                const results = event.target.result.sort((a, b) => b.lastUpdate - a.lastUpdate);
                resolve(results);
            };
            request.onerror = (event) => {
                reject(new Error(`Failed to get records: ${event.target.error}`));
            };
        });
    }

    // --- APPLICATION INITIALIZATION ---

    async function initDB() {
        try {
            db = await openDB();
            
            userIdDisplay.textContent = 'Ready (IndexedDB)';
            readyTimeMetric.textContent = 'Native DB Ready & Persisted';
            
            // Start the data loading loop
            loadAlumniData();
            // Set up polling interval to simulate "live" updates (3 seconds)
            setInterval(loadAlumniData, 3000); 

        } catch (error) {
            console.error('IndexedDB initialization failed:', error);
            readyTimeMetric.textContent = 'DB INIT ERROR. Check console.';
        }
    }


    // --- DATA LOADING & UI RENDERING ---

    async function loadAlumniData() {
        if (!db) return;

        try {
            const alumniList = await getAllAlumni();
            
            let totalMentors = alumniList.filter(a => a.isMentor === 1).length;

            // Update Metrics
            totalAlumniMetric.textContent = alumniList.length;
            mentorsMetric.textContent = totalMentors;
            readyTimeMetric.textContent = `Local Sync | ${new Date().toLocaleTimeString()}`;

            // Render Table
            renderAlumniTable(alumniList);

        } catch (error) {
            console.error("IndexedDB query failed:", error);
        }
    }
    
    function renderAlumniTable(alumni) {
        alumniTableBody.innerHTML = '';
        
        if (alumni.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');

        alumni.forEach((alum, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-700/30 transition duration-200';
            
            const isMentor = alum.isMentor === 1;
            
            const mentorStatus = isMentor
                ? '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30">✓ Mentor</span>'
                : '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-600/20 text-slate-400 border border-slate-600/30">Not Available</span>';

            row.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4">
                            ${alum.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="text-sm font-medium text-white">${alum.name}</div>
                            <div class="text-sm text-slate-400">${alum.contactEmail}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-slate-300 font-mono">${alum.gradYear}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-slate-300">${alum.field}</div>
                    <div class="text-sm text-slate-400">${alum.company}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="space-y-1">
                        <div class="flex items-center text-sm text-slate-300">
                            <svg class="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                            </svg>
                            ${alum.mobileNumber || 'Not provided'}
                        </div>
                        ${alum.linkedinProfile ? `
                            <div class="flex items-center text-sm">
                                <svg class="w-4 h-4 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                                <a href="${alum.linkedinProfile}" target="_blank" class="text-blue-400 hover:text-blue-300 transition-colors">
                                    LinkedIn Profile
                                </a>
                            </div>
                        ` : `
                            <div class="text-sm text-slate-500">No LinkedIn profile</div>
                        `}
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    ${mentorStatus}
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center space-x-2">
                        <button class="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="View Details">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                        <button class="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="Edit Alumni">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Alumni">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            `;
            alumniTableBody.appendChild(row);
        });
    }


    // --- MODAL AND FORM HANDLING ---

    function openModal() {
        if (!alumniModal || !modalContent) {
            console.error('Add Alumni modal elements are missing from the DOM.');
            return;
        }

        alumniModal.classList.remove('hidden');
        alumniModal.classList.add('flex');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Add entrance animation
        setTimeout(() => {
            alumniModal.classList.add('opacity-100');
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
            
            // Add bounce effect
            modalContent.style.animation = 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }, 10);
    }

    function closeModal() {
        if (!alumniModal || !modalContent || !modalMessage || !newAlumniForm) {
            console.error('Cannot close modal because required elements are missing.');
            return;
        }
        // Add exit animation
        modalContent.style.animation = 'bounceOut 0.4s cubic-bezier(0.55, 0.055, 0.675, 0.19)';
        
        setTimeout(() => {
            alumniModal.classList.remove('opacity-100');
            modalContent.classList.remove('scale-100', 'opacity-100');
            modalContent.classList.add('scale-95', 'opacity-0');
        }, 200);
        
        setTimeout(() => {
            alumniModal.classList.remove('flex');
            alumniModal.classList.add('hidden');
            modalMessage.classList.add('hidden');
            newAlumniForm.reset();
            document.body.style.overflow = 'auto'; // Restore scrolling
            modalContent.style.animation = ''; // Reset animation
        }, 400); 
    }

    // --- SIDEBAR FUNCTIONALITY ---
    function toggleSidebar() {
        sidebar.classList.toggle('-translate-x-full');
        mainContent.classList.toggle('ml-64');
    }

    // --- EVENT LISTENERS ---
    if (addAlumniButtons.length === 0) {
        console.error("No 'Add Alumni' buttons were found in the DOM. Modal cannot be triggered.");
    } else {
        addAlumniButtons.forEach((btn) => btn.addEventListener('click', openModal));
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    } else {
        console.error('Close modal button not found. Users cannot dismiss the modal via the close icon.');
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    } else {
        console.error('Cancel button in the modal is missing. Users cannot cancel the form.');
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    } else {
        console.warn('Sidebar toggle button not found. Collapsing sidebar will be unavailable.');
    }

    if (alumniModal) {
        alumniModal.addEventListener('click', (e) => {
            if (e.target === alumniModal) {
                closeModal();
            }
        });
    } else {
        console.error('Add Alumni modal container is missing; overlay click-to-close will not work.');
    }

    if (!newAlumniForm) {
        console.error('Add Alumni form not found. Submissions will fail.');
    } else {
        newAlumniForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!db) {
                modalMessage.textContent = "Database not ready. Please wait for initialization.";
                modalMessage.classList.remove('hidden');
                return;
            }

            submitAlumniBtn.disabled = true;
            submitAlumniBtn.textContent = 'Saving...';
            
            try {
                const newRecord = {
                    name: document.getElementById('alum-name').value.trim(),
                    gradYear: parseInt(document.getElementById('alum-year').value.trim()),
                    field: document.getElementById('alum-field').value.trim(),
                    company: document.getElementById('alum-company').value.trim(),
                    contactEmail: document.getElementById('alum-email').value.trim(),
                    mobileNumber: document.getElementById('alum-mobile').value.trim(),
                    linkedinProfile: document.getElementById('alum-linkedin').value.trim(),
                    isMentor: document.getElementById('alum-mentor').checked,
                };

                await addAlumnus(newRecord);
                
                console.log('Alumni record added:', newRecord.name);
                
                modalMessage.textContent = 'Record saved successfully!';
                modalMessage.className = 'text-sm text-center text-teal-400';
                modalMessage.classList.remove('hidden');
                
                loadAlumniData(); 

                setTimeout(closeModal, 1500);

            } catch (error) {
                console.error('Error adding document: ', error);
                modalMessage.textContent = `Error: ${error.message}. Check console.`;
                modalMessage.className = 'text-sm text-center text-red-400';
                modalMessage.classList.remove('hidden');
            } finally {
                submitAlumniBtn.disabled = false;
                submitAlumniBtn.textContent = 'Save Record';
            }
        });
    }

    // Start the application initialization
    initDB();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}


