import { useState, useEffect, useRef } from "react"

interface Incident {
  id: number
  tipo: string
  ubicacion: string
  descripcion: string
  rol: string
}

interface BackendPayload {
  tenant_id: string
  tipo_incidente: string
  ubicacion: string
  tipo_usuario: string
  descripcion: string
}

function App() {

  const API_URL = "https://dnli7p9e2d.execute-api.us-east-1.amazonaws.com/dev/reporte/crear"  
  const WS_URL = "wss://nr6709dv4c.execute-api.us-east-1.amazonaws.com/dev"

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const wsRef = useRef<WebSocket | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)

  const [formData, setFormData] = useState<Incident>({
    id: 0,
    tipo: "",
    ubicacion: "",
    descripcion: "",
    rol: ""
  })

  // ==============================
  // WEBSOCKET CONNECTION
  // ==============================
  useEffect(() => {
    const connectWebSocket = () => {
      console.log("Conectando a WebSocket:", WS_URL)
      const ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        console.log("WebSocket conectado")
        setIsConnected(true)
        
        // Solicitar incidentes actuales después de conectar
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              action: "getIncidents"
            }))
          }
        }, 500)
      }

      ws.onmessage = (event) => {
        console.log("Mensaje recibido:", event.data)
        try {
          const data = JSON.parse(event.data)
          console.log("Datos parseados:", data)
          
          // Manejar diferentes tipos de mensajes
          if (data.type === "incidentsList") {
            console.log("Incidentes recibidos:", data.incidents)
            // Aquí podrías actualizar el estado con los incidentes del servidor
          } else if (data.type === "nuevoReporte") {
            console.log("Nuevo reporte recibido:", data.data)
            // Aquí podrías agregar el nuevo reporte a la lista
          } else if (data.type === "error") {
            console.error("Error del servidor:", data.message)
          }
        } catch (err) {
          console.error("Error al parsear mensaje:", err)
        }
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setIsConnected(false)
      }

      ws.onclose = () => {
        console.log("WebSocket desconectado, intentando reconectar en 5s...")
        setIsConnected(false)
        // Intentar reconectar después de 5 segundos
        setTimeout(connectWebSocket, 5000)
      }

      wsRef.current = ws
    }

    connectWebSocket()

    // Cleanup al desmontar el componente
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Función para enviar mensajes por WebSocket
  const sendWebSocketMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      console.log("Mensaje enviado por WebSocket:", message)
    } else {
      console.warn("WebSocket no está conectado")
    }
  }

  // ==============================
  // API CALL
  // ==============================
  async function crearIncidente(data: BackendPayload) {
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })

      if (!resp.ok) {
        const text = await resp.text()
        console.error("API error:", resp.status, text)
        throw new Error(`API request failed: ${resp.status}`)
      }

      const json = await resp.json()
      return json
    } catch (err) {
      console.error("Failed to crearIncidente:", err)
      throw err
    }
  }

  // ==============================
  // ADD INCIDENT
  // ==============================
  const handleAddIncident = async () => {
    const { tipo, ubicacion, descripcion, rol } = formData

    if (!tipo || !ubicacion || !descripcion || !rol) {
      alert("Completa todos los campos")
      return
    }

    // Construir el JSON exacto que tu Lambda espera
    const payload: BackendPayload = {
      tenant_id: "utec",
      tipo_incidente: tipo,
      ubicacion: ubicacion,
      tipo_usuario: rol,
      descripcion: descripcion
    }

    // Guardar en UI local (no guardamos "urgencia" ya que será asignado por el backend)
    const newIncident: Incident = { ...formData, id: Date.now() }
    setIncidents((prev) => [...prev, newIncident])

    // Intentar enviar al backend
    try {
      await crearIncidente(payload)
      // Enviar notificación por WebSocket también
      sendWebSocketMessage({
        action: "nuevoReporte",
        data: payload
      })
    } catch (err) {
      console.error("Failed to enviar reporte:", err)
      alert("No se pudo enviar el reporte al servidor.")
    }

    // Limpiar formulario
    setFormData({
      id: 0,
      tipo: "",
      ubicacion: "",
      descripcion: "",
      rol: ""
    })

    setShowForm(false)
  }

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">
              Reportes de Incidentes
            </h1>
            <p className="text-gray-600">
              Gestiona y registra incidentes dentro del campus.
            </p>
          </div>
          {/* Indicador de conexión WebSocket */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>

      {/* Botón Abrir Formulario */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Crear Nuevo Incidente
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="max-w-4xl mx-auto mb-8 bg-gray-50 p-6 rounded-lg border border-gray-300">
          <h2 className="text-lg font-semibold text-black mb-4">
            Nuevo Reporte
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Tipo */}
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="border border-gray-400 rounded-lg px-4 py-2 text-black focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Tipo de incidente</option>
              <option value="Robo">Robo</option>
              <option value="Accidente">Accidente</option>
              <option value="Acoso">Acoso</option>
              <option value="Daño a propiedad">Daño a propiedad</option>
              <option value="Otro">Otro</option>
            </select>

            {/* Ubicación */}
            <input
              type="text"
              placeholder="Ubicación"
              value={formData.ubicacion}
              onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
              className="border border-gray-400 rounded-lg px-4 py-2 text-black"
            />

            {/* Rol */}
            <select
              value={formData.rol}
              onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
              className="border border-gray-400 rounded-lg px-4 py-2 text-black"
            >
              <option value="">Selecciona tu rol</option>
              <option value="estudiante">Estudiante</option>
              <option value="administrativo">Personal administrativo</option>
              <option value="autoridad">Autoridad</option>
            </select>
          </div>

          {/* Descripción */}
          <textarea
            placeholder="Descripción detallada del incidente..."
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            className="border border-gray-400 rounded-lg px-4 py-2 w-full text-black mb-4"
            rows={3}
          />

          <div className="flex gap-3">
            <button
              onClick={handleAddIncident}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Guardar
            </button>

            <button
              onClick={() => setShowForm(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de incidentes */}
      <div className="max-w-4xl mx-auto">
        {incidents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No hay reportes aún. ¡Crea uno para comenzar!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-black text-lg">{inc.tipo}</h3>
                    <p className="text-gray-700">📍 {inc.ubicacion}</p>
                    <p className="text-gray-600 mt-1">{inc.descripcion}</p>
                    <p className="mt-1 text-sm text-green-700 font-semibold">
                      Rol: {inc.rol}
                    </p>
                  </div>

                  <button
                    onClick={() => setIncidents(prev => prev.filter(r => r.id !== inc.id))}
                    className="text-red-600 hover:text-red-800 font-semibold"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
