import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {cors: {origin: "*"}});

app.use(express.json());
app.use(express.static("public"));

// Almacenamiento de incidentes (en producción usar una base de datos)
const incidents = {};
let incidentIdCounter = 1;

// Estados válidos de incidentes
const VALID_STATES = ['pendiente', 'en atención', 'resuelto'];

// Función para validar el estado
const isValidState = (state) => {
    return VALID_STATES.includes(state);
};

io.on("connection", (socket) => {
    console.log("Cliente conectado", socket.id);
    
    // Enviar la lista actual de incidentes al nuevo cliente
    socket.emit("incidentsList", Object.values(incidents));
    
    // Crear un nuevo incidente
    socket.on("createIncident", (data) => {
        const { titulo, descripcion, usuario } = data;
        
        if (!titulo || !descripcion) {
            socket.emit("error", "Título y descripción son requeridos");
            return;
        }
        
        const newIncident = {
            id: incidentIdCounter++,
            titulo,
            descripcion,
            usuario: usuario || "Anónimo",
            estado: "pendiente",
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString()
        };
        
        incidents[newIncident.id] = newIncident;
        
        // Emitir a todos los clientes
        io.emit("incidentCreated", newIncident);
        io.emit("incidentsList", Object.values(incidents));
        io.emit("notification", {
            tipo: "nuevo_incidente",
            mensaje: `Nuevo incidente creado: "${titulo}"`,
            incidente: newIncident
        });
        
        console.log(`Incidente ${newIncident.id} creado: ${titulo}`);
    });
    
    // Actualizar el estado de un incidente
    socket.on("updateIncidentState", (data) => {
        const { incidentId, nuevoEstado, usuario } = data;
        
        if (!incidents[incidentId]) {
            socket.emit("error", "Incidente no encontrado");
            return;
        }
        
        if (!isValidState(nuevoEstado)) {
            socket.emit("error", `Estado inválido. Estados válidos: ${VALID_STATES.join(", ")}`);
            return;
        }
        
        const incident = incidents[incidentId];
        const estadoAnterior = incident.estado;
        
        // Actualizar el incidente
        incident.estado = nuevoEstado;
        incident.fechaActualizacion = new Date().toISOString();
        if (usuario) {
            incident.ultimoActualizador = usuario;
        }
        
        // Emitir actualización a todos los clientes
        io.emit("incidentUpdated", incident);
        io.emit("incidentsList", Object.values(incidents));
        io.emit("notification", {
            tipo: "estado_actualizado",
            mensaje: `El incidente "${incident.titulo}" cambió de "${estadoAnterior}" a "${nuevoEstado}"`,
            incidente: incident,
            estadoAnterior,
            nuevoEstado
        });
        
        console.log(`Incidente ${incidentId} actualizado: ${estadoAnterior} -> ${nuevoEstado}`);
    });
    
    // Obtener un incidente específico
    socket.on("getIncident", (incidentId) => {
        const incident = incidents[incidentId];
        if (incident) {
            socket.emit("incidentData", incident);
        } else {
            socket.emit("error", "Incidente no encontrado");
        }
    });
    
    // Obtener todos los incidentes
    socket.on("getAllIncidents", () => {
        socket.emit("incidentsList", Object.values(incidents));
    });
    
    socket.on("disconnect", () => {
        console.log("Cliente desconectado", socket.id);
    });
});

const PORT = 3001;
server.listen(PORT, () => console.log(`Servidor esta corriendo en http://localhost:${PORT}`));