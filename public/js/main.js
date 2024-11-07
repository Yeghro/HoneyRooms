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

// Add this UUID generator function
function generateUUID() {
    return crypto.randomUUID()
}

// Add event listeners after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generateKeyPair')
    const useKeysButton = document.getElementById('useGeneratedKeys')
    const generatedKeysDiv = document.getElementById('generatedKeys')

    // Make copyToClipboard available globally
    window.copyToClipboard = copyToClipboard

    generateButton?.addEventListener('click', () => {
        try {
            const { npub, nsec } = generateKeyPair()
            
            // Fill in the generated keys
            document.getElementById('generatedNpub').value = npub
            document.getElementById('generatedNsec').value = nsec
            
            // Show the generated keys section
            generatedKeysDiv.classList.remove('hidden')
        } catch (error) {
            console.error('Error generating keys:', error)
            alert('Failed to generate keys. Please try again.')
        }
    })

    useKeysButton?.addEventListener('click', () => {
        const npub = document.getElementById('generatedNpub').value
        const nsec = document.getElementById('generatedNsec').value
        
        // Fill in the form fields
        document.getElementById('roomNpub').value = npub
        document.getElementById('roomNsec').value = nsec
        
        // Hide the generated keys section
        generatedKeysDiv.classList.add('hidden')
    })

    // Add UUID generator button handler
    const generateUUIDButton = document.getElementById('generateUUID')
    generateUUIDButton?.addEventListener('click', () => {
        const uuid = generateUUID()
        document.getElementById('roomOwner').value = uuid
    })
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
        const row = document.createElement('tr');
        row.className = 'bg-white border-b hover:bg-gray-50';
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
                <button onclick="editRoom('${room.id}')" class="font-medium text-blue-600 hover:underline mr-3">Edit</button>
                <button onclick="deleteRoom('${room.id}')" class="font-medium text-red-600 hover:underline">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Add Room form submission
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
            room_owner: roomOwner,  // This is now validated as a UUID
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

        console.log('Room ID:', roomOwner)
        console.log('Full room data being sent:', roomData)

        const response = await fetch('/api/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(roomData)
        })

        const responseText = await response.text()
        console.log('Server response:', responseText)

        if (!response.ok) {
            let errorMessage
            try {
                const errorData = JSON.parse(responseText)
                // Improved error messaging for foreign key violations
                if (errorData.code === '23503') {
                    errorMessage = 'The specified room owner ID does not exist in the system. Please ensure the owner is registered first.'
                } else {
                    errorMessage = errorData.error || errorData.details || 'Failed to create room'
                }
            } catch {
                errorMessage = responseText || 'Failed to create room'
            }
            throw new Error(errorMessage)
        }

        // Parse the success response
        const data = JSON.parse(responseText)
        console.log('Room created successfully:', data)
        
        // Close modal - Update this part
        const modal = document.getElementById('addRoomModal')
        if (modal) {
            // Use the data-modal-hide attribute to close the modal
            modal.setAttribute('aria-hidden', 'true')
            modal.classList.add('hidden')
            // Remove modal backdrop if it exists
            const backdrop = document.querySelector('[modal-backdrop]')
            if (backdrop) {
                backdrop.remove()
            }
        }

        // Refresh rooms list and reset form
        fetchRooms()
        e.target.reset()
    } catch (error) {
        console.error('Error adding room:', error)
        alert(`Failed to create room: ${error.message}`)
    }
})

// Delete room function
async function deleteRoom(id) {
    if (confirm('Are you sure you want to delete this room?')) {
        try {
            const response = await fetch(`/api/rooms/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchRooms();
            }
        } catch (error) {
            console.error('Error deleting room:', error);
        }
    }
}

// Initial load of rooms
fetchRooms();