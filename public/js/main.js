import { generateSecretKey, getPublicKey } from 'https://esm.sh/nostr-tools@2.10.1/pure'
import { bytesToHex } from 'https://esm.sh/@noble/hashes@1.3.3/utils'
import * as nip19 from 'https://esm.sh/nostr-tools@2.10.1/nip19'

function generateKeyPair() {
    try {
        // Generate secret key as Uint8Array
        const secretKey = generateSecretKey()
        
        // Get public key as hex string
        const publicKey = getPublicKey(secretKey)
        
        // Encode to npub/nsec format
        const npub = nip19.npubEncode(publicKey)
        const nsec = nip19.nsecEncode(secretKey)
        
        return { npub, nsec }
    } catch (error) {
        console.error('Error generating key pair:', error)
        throw new Error('Failed to generate Nostr keys')
    }
}

async function copyToClipboard(elementId) {
    try {
        const element = document.getElementById(elementId)
        await navigator.clipboard.writeText(element.value)
        
        // Visual feedback
        element.classList.add('bg-green-50')
        setTimeout(() => {
            element.classList.remove('bg-green-50')
        }, 200)
    } catch (error) {
        console.error('Failed to copy:', error)
    }
}

// Add this helper function
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
}

// Key generation handler
function setupKeyGeneration() {
    const generateButton = document.getElementById('generateKeyPair')
    const npubInput = document.getElementById('roomNpub')
    const nsecInput = document.getElementById('roomNsec')

    if (!generateButton || !npubInput || !nsecInput) {
        console.warn('Key generation elements not found in DOM')
        return
    }

    generateButton.addEventListener('click', () => {
        try {
            const { npub, nsec } = generateKeyPair()
            
            // Double-check elements exist before setting values
            if (npubInput && nsecInput) {
                npubInput.value = npub
                nsecInput.value = nsec
            } else {
                throw new Error('Input fields not found')
            }
        } catch (error) {
            console.error('Error generating keys:', error)
            alert('Failed to generate keys. Please try again.')
        }
    })
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tabs
    initTabs()
    
    // Setup key generation
    setupKeyGeneration()
    
    // ... rest of your initialization code ...
})

// Function to fetch and display rooms
async function fetchRooms() {
    try {
        const response = await fetch('/api/rooms');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Ensure we have an array
        const rooms = Array.isArray(data) ? data : [];
        console.log('Received rooms:', rooms); // Debug log
        
        displayRooms(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        document.getElementById('roomsTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-red-500">
                    Failed to load rooms. Please try again later.
                </td>
            </tr>
        `;
    }
}

// Function to display rooms in the table
function displayRooms(rooms) {
    if (!Array.isArray(rooms)) {
        console.error('Expected array of rooms, got:', rooms);
        return;
    }

    const tableBody = document.getElementById('roomsTableBody');
    tableBody.innerHTML = '';

    if (rooms.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No rooms available
                </td>
            </tr>
        `;
        return;
    }

    rooms.forEach(room => {
        const row = document.createElement('tr')
        row.className = 'bg-white border-b hover:bg-gray-50'
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    ${room.room_picture_url ? 
                        `<img src="${room.room_picture_url}" class="w-10 h-10 rounded-full mr-3" alt="${room.room_name}">` : 
                        '<div class="w-10 h-10 rounded-full bg-gray-200 mr-3"></div>'}
                    ${room.room_name}
                </div>
            </td>
            <td class="px-6 py-4">${room.room_description || ''}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs ${room.room_visibility ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${room.room_visibility ? 'Public' : 'Private'}
                </span>
            </td>
            <td class="px-6 py-4">${room.room_zap_goal || 0} sats</td>
            <td class="px-6 py-4">
                <button class="edit-btn font-medium text-blue-600 hover:underline mr-3">Edit</button>
                <button class="delete-btn font-medium text-red-600 hover:underline">Delete</button>
            </td>
        `

        // Attach event listeners
        const editBtn = row.querySelector('.edit-btn')
        const deleteBtn = row.querySelector('.delete-btn')

        editBtn.addEventListener('click', () => editRoom(room.id))
        deleteBtn.addEventListener('click', () => deleteRoom(room.id))

        tableBody.appendChild(row)
    })
}

// Define the functions normally (not on window)
async function deleteRoom(id) {
    if (confirm('Are you sure you want to delete this room?')) {
        try {
            const response = await fetch(`/api/rooms/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                fetchRooms()
            } else {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Failed to delete room')
            }
        } catch (error) {
            console.error('Error deleting room:', error)
            alert('Failed to delete room: ' + error.message)
        }
    }
}

async function editRoom(id) {
    try {
        // Fetch the room data
        const response = await fetch(`/api/rooms/${id}`)
        if (!response.ok) throw new Error('Failed to fetch room data')
        const room = await response.json()
        
        // Populate the modal with existing data
        document.getElementById('roomName').value = room.room_name
        document.getElementById('roomNpub').value = room.room_npub
        document.getElementById('roomNsec').value = room.room_nsec
        document.getElementById('roomOwner').value = room.room_owner
        document.getElementById('roomDescription').value = room.room_description || ''
        document.getElementById('roomPictureUrl').value = room.room_picture_url || ''
        document.getElementById('zapGoal').value = room.room_zap_goal || 0
        document.getElementById('roomVisibility').checked = room.room_visibility
        document.getElementById('relayUrl').value = room.room_relay_url || ''
        document.getElementById('nostrAcl').value = (room.room_nostr_acl_list || []).join(', ')
        document.getElementById('emailAcl').value = (room.room_email_acl_list || []).join(', ')
        document.getElementById('saveChatDirective').checked = room.save_chat_directive
        document.getElementById('roomNip05').value = room.room_nip05 || ''
        document.getElementById('lightningAddress').value = room.room_lightning_address || ''
        
        // Store the room ID for the update
        document.getElementById('addRoomForm').dataset.editId = id
        
        // Update modal title and submit button
        const modalTitle = document.querySelector('#addRoomModal .text-xl')
        modalTitle.textContent = 'Edit Room'
        
        const submitButton = document.querySelector('#addRoomForm button[type="submit"]')
        submitButton.textContent = 'Update Room'
        
        // Show the modal
        const modal = document.getElementById('addRoomModal')
        modal.classList.remove('hidden')
    } catch (error) {
        console.error('Error loading room data:', error)
        alert('Failed to load room data for editing')
    }
}

// Modify the form submission handler
document.getElementById('addRoomForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    try {
        const roomOwner = document.getElementById('roomOwner').value.trim()
        if (!roomOwner) {
            throw new Error('Room owner is required')
        }
        if (!isValidUUID(roomOwner)) {
            throw new Error('Room owner must be a valid UUID')
        }

        const roomData = {
            room_name: document.getElementById('roomName').value,
            room_npub: document.getElementById('roomNpub').value,
            room_nsec: document.getElementById('roomNsec').value,
            room_owner: roomOwner,
            room_description: document.getElementById('roomDescription').value || null,
            room_picture_url: document.getElementById('roomPictureUrl').value || null,
            room_nip05: document.getElementById('roomNip05').value || null,
            room_lightning_address: document.getElementById('lightningAddress').value || null,
            room_zap_goal: parseInt(document.getElementById('zapGoal').value) || 0,
            room_visibility: document.getElementById('roomVisibility').checked,
            room_nostr_acl_list: document.getElementById('nostrAcl').value.split(',').map(s => s.trim()).filter(Boolean),
            room_email_acl_list: document.getElementById('emailAcl').value.split(',').map(s => s.trim()).filter(Boolean),
            save_chat_directive: document.getElementById('saveChatDirective').checked,
            room_relay_url: document.getElementById('relayUrl').value || null
        }

        const editId = e.target.dataset.editId
        const isEdit = Boolean(editId)

        const url = isEdit ? `/api/rooms/${editId}` : '/api/rooms'
        const method = isEdit ? 'PUT' : 'POST'

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(roomData)
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to save room')
        }

        // Reset form and modal state
        e.target.reset()
        delete e.target.dataset.editId
        
        // Reset modal title and submit button
        const modalTitle = document.querySelector('#addRoomModal .text-xl')
        modalTitle.textContent = 'Add New Room'
        
        const submitButton = document.querySelector('#addRoomForm button[type="submit"]')
        submitButton.textContent = 'Create Room'
        
        // Close modal
        const modal = document.getElementById('addRoomModal')
        modal.classList.add('hidden')
        
        // Refresh rooms list
        fetchRooms()
    } catch (error) {
        console.error('Error saving room:', error)
        alert(`Failed to save room: ${error.message}`)
    }
})

// Add modal reset handler when closing
document.querySelectorAll('[data-modal-hide="addRoomModal"]').forEach(button => {
    button.addEventListener('click', () => {
        const form = document.getElementById('addRoomForm')
        form.reset()
        delete form.dataset.editId
        
        // Reset modal title and submit button
        const modalTitle = document.querySelector('#addRoomModal .text-xl')
        modalTitle.textContent = 'Add New Room'
        
        const submitButton = document.querySelector('#addRoomForm button[type="submit"]')
        submitButton.textContent = 'Create Room'
    })
})

// Initial load of rooms
fetchRooms();

// Modal handling functions
function openModal(modalId) {
    const modal = document.getElementById(modalId)
    if (!modal) return
    
    // Show modal
    modal.classList.remove('hidden')
    
    // Set focus trap
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]
    
    // Focus first input
    firstFocusable?.focus()

    // Trap focus in modal
    modal.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault()
                    lastFocusable?.focus()
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault()
                    firstFocusable?.focus()
                }
            }
        }
    })
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId)
    if (!modal) return
    
    // Hide modal
    modal.classList.add('hidden')
    
    // Return focus to trigger
    const trigger = document.querySelector(`[data-modal-target="${modalId}"]`)
    trigger?.focus()
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Modal triggers
    document.querySelectorAll('[data-modal-target]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            const modalId = trigger.getAttribute('data-modal-target')
            openModal(modalId)
        })
    })

    // Modal close buttons
    document.querySelectorAll('[data-modal-hide]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            const modalId = trigger.getAttribute('data-modal-hide')
            closeModal(modalId)
        })
    })

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const visibleModal = document.querySelector('[role="dialog"]:not(.hidden)')
            if (visibleModal) {
                closeModal(visibleModal.id)
            }
        }
    })

    // Close on backdrop click
    document.querySelectorAll('[role="dialog"]').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id)
            }
        })
    })
})

// Add this function near the top of the file
function initTabs() {
    const tabButtons = document.querySelectorAll('[role="tab"]')
    const tabPanels = document.querySelectorAll('[role="tabpanel"]')
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Deactivate all tabs
            tabButtons.forEach(btn => {
                btn.setAttribute('aria-selected', 'false')
                btn.classList.remove('text-blue-600', 'border-blue-600')
            })
            
            // Hide all panels
            tabPanels.forEach(panel => {
                panel.classList.add('hidden')
            })
            
            // Activate clicked tab
            button.setAttribute('aria-selected', 'true')
            button.classList.add('text-blue-600', 'border-blue-600')
            
            // Show corresponding panel
            const panelId = button.getAttribute('data-tabs-target').substring(1)
            const panel = document.getElementById(panelId)
            if (panel) {
                panel.classList.remove('hidden')
            }
        })
    })

    // Set initial active tab
    const initialTab = document.querySelector('[role="tab"][aria-selected="true"]') || tabButtons[0]
    if (initialTab) {
        initialTab.click()
    }
}

// The initTabs() function is already being called in your DOMContentLoaded event listener