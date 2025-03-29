// URLs del backend - CONFIGURACIÓN CORRECTA
const AUTH_URL = 'https://chatbackendbaio.onrender.com/api/auth';
const API_URL = 'https://chatbackendbaio.onrender.com/api';
const SOCKET_URL = 'https://chatbackendbaio.onrender.com';

// Variables globales
let currentUser = null;
let currentToken = null;
let currentRoom = null;
let socket = null;

// Elementos del DOM
const authPanel = document.getElementById('auth-panel');
const mainPanel = document.getElementById('main-panel');
const welcomeMessage = document.getElementById('welcome-message');
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const roomList = document.getElementById('room-list');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const currentRoomDisplay = document.getElementById('current-room');
const roomForm = document.getElementById('room-form');

// Event Listeners
document.getElementById('register-btn').addEventListener('click', register);
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('create-room-btn').addEventListener('click', showRoomForm);
document.getElementById('confirm-room-btn').addEventListener('click', createRoom);
document.getElementById('cancel-room-btn').addEventListener('click', hideRoomForm);
document.getElementById('send-btn').addEventListener('click', sendMessage);

// Funciones de autenticación (USANDO AUTH_URL)
// Modificar las funciones de registro y login
async function register() {
    const usernameInput = document.getElementById('reg-username');
    const passwordInput = document.getElementById('reg-password');
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const registerBtn = document.getElementById('register-btn');

    // Resetear estados anteriores
    usernameInput.classList.remove('is-invalid');
    passwordInput.classList.remove('is-invalid');
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Registrando...';

    try {
        // PRIMERO verificar si el usuario existe
        const checkResponse = await fetch(`${AUTH_URL}/check-username`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const checkData = await checkResponse.json();

        if (checkData.exists) {
            throw { 
                error: 'El nombre de usuario ya está en uso. Por favor elige otro.',
                field: 'username',
                code: 'USERNAME_EXISTS'
            };
        }

        if (!checkData.valid) {
            throw {
                error: 'El usuario debe tener al menos 4 caracteres',
                field: 'username',
                code: 'USERNAME_TOO_SHORT'
            };
        }

        // LUEGO validar contraseña
        if (password.length < 6) {
            throw {
                error: 'La contraseña debe tener al menos 6 caracteres',
                field: 'password',
                code: 'PASSWORD_TOO_SHORT'
            };
        }

        // FINALMENTE registrar si todo está bien
        const registerResponse = await fetch(`${AUTH_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const registerData = await registerResponse.json();

        if (!registerResponse.ok) throw registerData;

        // Registro exitoso
        showAlert('success', '¡Registro exitoso! Ahora puedes iniciar sesión');
        usernameInput.value = '';
        passwordInput.value = '';
        
        // Cambiar a pestaña de login
        document.getElementById('login-tab').click();
        document.getElementById('login-username').value = username;
        
    } catch (error) {
        // Manejar errores
        if (error.field === 'username') {
            usernameInput.classList.add('is-invalid');
            showAlert('error', error.error);
        } 
        else if (error.field === 'password') {
            passwordInput.classList.add('is-invalid');
            showAlert('error', error.error);
        }
        else {
            showAlert('error', error.error || 'Error en el registro. Intenta nuevamente.');
        }
    } finally {
        registerBtn.disabled = false;
        registerBtn.innerHTML = 'Registrarse';
    }
}


// Validación en tiempo real (opcional pero recomendado)
document.getElementById('reg-username').addEventListener('input', async function() {
    const username = this.value.trim();
    const errorElement = this.nextElementSibling; // Asume que el mensaje de error sigue inmediatamente al input
    
    // Limpiar estados anteriores
    this.classList.remove('is-invalid');
    if (errorElement && errorElement.classList.contains('invalid-feedback')) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    // Solo validar si hay contenido
    if (username.length > 0) {
        try {
            const response = await fetch(`${AUTH_URL}/check-username`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            
            const data = await response.json();
            
            if (data.exists) {
                showValidationError(this, 'Este nombre de usuario ya está en uso');
            } else if (username.length < 4) {
                showValidationError(this, 'El usuario debe tener al menos 4 caracteres');
            }
        } catch (error) {
            console.error("Error en validación:", error);
        }
    }
});

// Función auxiliar para mostrar errores
function showValidationError(inputElement, message) {
    inputElement.classList.add('is-invalid');
    const errorElement = inputElement.nextElementSibling;
    
    if (errorElement && errorElement.classList.contains('invalid-feedback')) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        showAlert('error', message, 3000);
    }
}

async function login() {
    // Limpiar errores previos
    document.getElementById('login-username').classList.remove('is-invalid');
    document.getElementById('login-password').classList.remove('is-invalid');
    document.querySelectorAll('#login-form .invalid-feedback').forEach(el => {
        el.style.display = 'none';
    });

    // Validar campos vacíos primero
    if (!validateLoginForm()) {
        return;
    }

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('login-btn');

    // Mostrar estado de carga
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Ingresando...';

    try {
        const response = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            currentToken = data.token;
            currentUser = { id: data.userId, username };
            
            // Mostrar panel principal
            authPanel.classList.add('d-none');
            mainPanel.classList.remove('d-none');
            welcomeMessage.textContent = `Bienvenido, ${username}`;
            
            // Mostrar notificación de éxito
            showAlert('success', 'Sesión iniciada correctamente', 3000);
            
            // Inicializar WebSocket y cargar salas
            initSocket();
            loadRooms();
        } else {
            // Mostrar error específico para credenciales incorrectas
            if (response.status === 401) {
                document.getElementById('login-username').classList.add('is-invalid');
                document.getElementById('login-password').classList.add('is-invalid');
                
                // Crear mensaje de error personalizado
                const errorDiv = document.createElement('div');
                errorDiv.className = 'text-center text-danger mt-2 mb-3';
                errorDiv.textContent = 'Usuario o contraseña incorrectos';
                
                // Insertar después del botón de login
                const loginForm = document.getElementById('login-form');
                const existingError = loginForm.querySelector('.login-error');
                if (existingError) {
                    existingError.remove();
                }
                loginForm.appendChild(errorDiv);
                errorDiv.classList.add('login-error');
                
            } else {
                throw new Error(data.error || 'Error en el login');
            }
        }
    } catch (error) {
        showAlert('error', error.message);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Ingresar';
    }
}

function logout() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    currentUser = null;
    currentToken = null;
    currentRoom = null;
    
    mainPanel.classList.add('d-none');
    authPanel.classList.remove('d-none');
    
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    roomList.innerHTML = '';
    messagesContainer.innerHTML = '';
    messageForm.classList.add('d-none');
    currentRoomDisplay.textContent = 'Selecciona una sala';
}

// Funciones de salas (USANDO API_URL)
async function loadRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error('El servidor no devolvió JSON: ' + text.substring(0, 100));
        }

        const rooms = await response.json();
        
        if (response.ok) {
            renderRooms(rooms);
        } else {
            throw new Error(rooms.error || 'Error al cargar las salas');
        }
    } catch (error) {
        console.error("Error en loadRooms:", error);
        alert(`Error al cargar salas: ${error.message}`);
    }
}



function renderRooms(rooms) {
    roomList.innerHTML = '';
    
    if (rooms.length === 0) {
        roomList.innerHTML = '<li class="list-group-item text-muted">No hay salas disponibles</li>';
        return;
    }
    
    rooms.forEach(room => {
        const roomItem = document.createElement('li');
        roomItem.className = 'list-group-item room-item d-flex justify-content-between align-items-center';
        
        
        // Añadir un data attribute con el ID de la sala
        roomItem.setAttribute('data-room-id', room._id);
        
        
        roomItem.innerHTML = `
            <span>${room.name}</span>
            <small class="text-muted">Creada por: ${room.createdBy.username}</small>
        `;
        
        roomItem.addEventListener('click', () => joinRoom(room));
        
        // Mostrar botón de eliminar solo si el usuario es el creador
        if (room.createdBy._id === currentUser.id) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showDeleteRoomModal(room._id);
            });
            roomItem.appendChild(deleteBtn);
        }
        
        roomList.appendChild(roomItem);
    });
}


async function createRoom() {
    const roomName = document.getElementById('room-name').value.trim();
    
    if (!roomName) {
        alert('Por favor ingresa un nombre para la sala');
        return;
    }

    // Verificar si ya existe una sala con ese nombre
    const existingRooms = document.querySelectorAll('#room-list span');
    const duplicateRoom = Array.from(existingRooms).find(
        room => room.textContent.toLowerCase() === roomName.toLowerCase()
    );

    if (duplicateRoom) {
        // Mostrar una alerta bonita de Bootstrap
        const alertHTML = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <strong>¡Ups!</strong> Ya existe una sala con ese nombre.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        // Insertar la alerta justo antes del formulario de sala
        const roomFormContainer = document.getElementById('room-form');
        roomFormContainer.insertAdjacentHTML('beforebegin', alertHTML);
        
        return;
    }

    try {
        const response = await fetch(`${API_URL}/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name: roomName })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Emitir evento de nueva sala a través de socket
            socket.emit('nuevaSala', {
                ...data,
                createdBy: {
                    username: currentUser.username
                }
            });
            
            hideRoomForm();
            loadRooms();
        } else {
            throw new Error(data.error || 'Error al crear la sala');
        }
    } catch (error) {
        alert(error.message);
    }
}

let roomToDelete = null; // Variable para almacenar temporalmente el ID de la sala a eliminar

// Función para mostrar el modal de confirmación
function showDeleteRoomModal(roomId) {
    roomToDelete = roomId;
    const modalElement = document.getElementById('deleteRoomModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        console.error('Modal element not found');
        // Fallback al confirm tradicional si el modal no existe
        if (confirm('¿Estás seguro de que quieres eliminar esta sala?')) {
            deleteRoom(roomId);
        }
    }
}


// Función para eliminar la sala (versión mejorada)
async function deleteRoom(roomId) {
    const deleteBtn = document.getElementById('confirmDeleteRoom');
    const deleteText = document.getElementById('deleteButtonText');
    const deleteSpinner = document.getElementById('deleteButtonSpinner');
    
    try {
        // Mostrar estado de carga
        deleteBtn.disabled = true;
        deleteText.textContent = 'Eliminando...';
        deleteSpinner.classList.remove('d-none');

        const response = await fetch(`${API_URL}/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            // Emitir evento de sala eliminada
            socket.emit('salaBorrada', roomId);

            if (currentRoom && currentRoom._id === roomId) {
                leaveCurrentRoom();
            }
            
            // Mostrar notificación de éxito
            showAlert('success', 'Sala eliminada correctamente', 3000);
            
            // Actualizar lista de salas
            loadRooms();
        } else {
            throw new Error(data.error || 'Error al eliminar la sala');
        }
    } catch (error) {
        showAlert('error', error.message, 5000);
    } finally {
        // Restaurar estado del botón
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteText.textContent = 'Eliminar';
            deleteSpinner.classList.add('d-none');
        }
        roomToDelete = null;
    }
}




function showRoomForm() {
    roomForm.classList.remove('d-none');
    document.getElementById('room-name').value = ''; // Limpiar el input
    document.getElementById('room-name').focus(); // Enfocar el input
}

function hideRoomForm() {
    roomForm.classList.add('d-none');
    document.getElementById('room-name').value = ''; // Limpiar el input
}

// Funciones de chat
function initSocket() {
    socket = io(SOCKET_URL, {
        auth: {
            token: currentToken
        }
    });

    socket.on('connect', () => {
        console.log('Conectado al servidor de WebSocket');
        
        // Enviar información del usuario al conectarse
        socket.emit('setUserInfo', {
            username: currentUser.username,
            userId: currentUser.id
        });
    });

    socket.on('disconnect', () => {
        console.log('Desconectado del servidor de WebSocket');
    });

    socket.on('mensaje', (data) => {
        // Verificar si el mensaje es para la sala actual
        if (currentRoom && (data.tipo === 'sistema' || data.sala === currentRoom._id)) {
            addMessage(data);
        }
    });

    // Escuchar nuevas salas en tiempo real
    socket.on('salaCreada', (room) => {
        // Verificar si la sala ya existe para evitar duplicados
        const existingRoom = Array.from(roomList.children).find(
            item => item.querySelector('span').textContent === room.name
        );

        if (!existingRoom) {
            const roomItem = document.createElement('li');
            roomItem.className = 'list-group-item room-item d-flex justify-content-between align-items-center';
            roomItem.innerHTML = `
                <span>${room.name}</span>
                <small class="text-muted">Creada por: ${room.createdBy.username}</small>
            `;
            
            roomItem.addEventListener('click', () => joinRoom(room));
            
            // Si el usuario actual es el creador, agregar botón de eliminar
            if (room.createdBy._id === currentUser.id) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-danger';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteRoom(room._id);
                });
                roomItem.appendChild(deleteBtn);
            }
            
            roomList.appendChild(roomItem);
        }
    });


     // Escuchar evento de sala eliminada
     socket.on('salaEliminada', (roomId) => {
        // Eliminar la sala de la lista
        const roomToRemove = document.querySelector(`[data-room-id="${roomId}"]`);
        if (roomToRemove) {
            roomToRemove.remove();
        }
    });

    socket.on('connect_error', (err) => {
        console.error('Error de conexión:', err);
        alert('Error de conexión con el servidor de chat');
    });

     // Manejar tecla Enter solo en el campo de mensaje
     messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Evitar comportamiento por defecto
            sendMessage();
        }
    });
}


// Añade al inicio de tu script, después de los event listeners existentes:
document.getElementById('login-form').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('login-btn').click();
    }
});

document.getElementById('register-form').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('register-btn').click();
    }
});

document.getElementById('message-form').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('send-btn').click();
    }
});

function joinRoom(room) {
    // Salir de la sala actual si hay una
    if (currentRoom) {
        leaveCurrentRoom();
    }
    
    // Unirse a la nueva sala
    currentRoom = room;
    socket.emit('unirseSala', room._id);
    
    // Actualizar UI
    currentRoomDisplay.textContent = room.name;
    messageForm.classList.remove('d-none');
    messageInput.focus();
    
    // Marcar sala como activa en la lista
    const roomItems = document.querySelectorAll('.room-item');
    roomItems.forEach(item => {
        item.classList.remove('active-room');
        if (item.getAttribute('data-room-id') === room._id) {
            item.classList.add('active-room');
        }
    });
    
    // Limpiar mensajes anteriores
    messagesContainer.innerHTML = '';
    addSystemMessage(`Te has unido a la sala "${room.name}"`);
}

function leaveCurrentRoom() {
    if (!currentRoom) return;
    
    addSystemMessage(`Has abandonado la sala "${currentRoom.name}"`);
    currentRoom = null;
    currentRoomDisplay.textContent = 'Selecciona una sala';
    messageForm.classList.add('d-none');
}

function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || !currentRoom) return;
    
    // Limpiar el input antes de enviar para mejor UX
    messageInput.value = '';
    
    // Enfocar el input nuevamente para continuar escribiendo
    messageInput.focus();
    
    socket.emit('mensaje', {
        sala: currentRoom._id,
        texto: message
    });
}
function addMessage(data) {
    // Verificar si el mensaje es válido
    if (!data || (data.tipo !== 'sistema' && !data.usuario)) {
        console.error('Mensaje mal formado:', data);
        return;
    }

    const messageDiv = document.createElement('div');
    
    if (data.tipo === 'sistema') {
        // Mensaje del sistema
        messageDiv.className = 'text-center text-muted mb-2';
        messageDiv.textContent = data.texto || data; // Soporta tanto objetos como strings
    } else {
        // Mensaje de usuario normal
        const isCurrentUser = data.usuario === currentUser.username;
        messageDiv.className = isCurrentUser ? 'message user-message' : 'message other-message';
        
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'fw-bold';
        usernameSpan.textContent = data.usuario;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = `: ${data.texto}`;
        
        messageDiv.appendChild(usernameSpan);
        messageDiv.appendChild(textSpan);
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addSystemMessage(text) {
    // Asegurarse de que siempre sea un objeto bien formado
    if (typeof text === 'string') {
        addMessage({
            tipo: 'sistema',
            texto: text
        });
    } else {
        // Si ya es un objeto, verificar que tenga las propiedades necesarias
        addMessage(text);
    }
}



// Función para mostrar alertas personalizadas
function showAlert(type, message, duration = 5000) {
    const alertTypes = {
        success: { icon: 'check-circle', class: 'alert-success' },
        error: { icon: 'exclamation-circle', class: 'alert-error' },
        warning: { icon: 'exclamation-triangle', class: 'alert-warning' },
        info: { icon: 'info-circle', class: 'alert-info' }
    };
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${alertTypes[type].class}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${alertTypes[type].icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Forzar reflow para activar la transición
    void alertDiv.offsetWidth;
    
    alertDiv.classList.add('show');
    
    // Eliminar la alerta después de la duración
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertDiv.remove();
        }, 400);
    }, duration);
}


// Validación de formulario de login
// Mueve este código al final del archivo, justo antes de validateLoginForm
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('confirmDeleteRoom')?.addEventListener('click', () => {
        if (roomToDelete) {
            deleteRoom(roomToDelete);
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteRoomModal'));
            modal.hide();
        }
    });
});
// Validación de formulario de login
function validateLoginForm() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    let isValid = true;

    // Resetear validaciones
    document.getElementById('login-username').classList.remove('is-invalid');
    document.getElementById('login-password').classList.remove('is-invalid');
    document.querySelectorAll('#login-form .invalid-feedback').forEach(el => {
        el.style.display = 'none';
    });

    // Validar campos vacíos
    if (!username) {
        document.getElementById('login-username').classList.add('is-invalid');
        document.querySelector('#login-username + .invalid-feedback').style.display = 'block';
        isValid = false;
    }

    if (!password) {
        document.getElementById('login-password').classList.add('is-invalid');
        document.querySelector('#login-password + .invalid-feedback').style.display = 'block';
        isValid = false;
    }

    return isValid;
}