import { useState } from "react"

interface Incident {
  id: number
  tipo: string
  ubicacion: string
  descripcion: string
  urgencia: string
  rol: string
}

interface BackendPayload {
  tenant_id: string
  tipo_incidente: string
  nivel_urgencia: string
  ubicacion: string
  tipo_usuario: string
  descripcion: string
}

function App() {

  const API_URL =
    "https://4iyael92qd.execute-api.us-east-1.amazonaws.com/dev/reporte/crear"

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [showForm, setShowForm] = useState<boolean>(false)

  const [formData, setFormData] = useState<Incident>({
    id: 0,
    tipo: "",
    ubicacion: "",
    descripcion: "",
    urgencia: "",
    rol: ""
  })

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
    const { tipo, ubicacion, descripcion, urgencia, rol } = formData

    if (!tipo || !ubicacion || !descripcion || !urgencia || !rol) {
      alert("Completa todos los campos")
      return
    }

    // Construir el JSON exacto que tu Lambda espera
    const payload: BackendPayload = {
      tenant_id: "uted", // tu tenant real
      tipo_incidente: tipo,
      nivel_urgencia: urgencia,
      ubicacion: ubicacion,
      tipo_usuario: rol,
      descripcion: descripcion
    }

    // Guardar en UI local
    const newIncident: Incident = { ...formData, id: Date.now() }
    setIncidents((prev) => [...prev, newIncident])

    // Intentar enviar al backend
    try {
      await crearIncidente(payload)
    } catch (err) {
      alert("No se pudo enviar el reporte al servidor.")
    }

    // Limpiar formulario
    setFormData({
      id: 0,
      tipo: "",
      ubicacion: "",
      descripcion: "",
      urgencia: "",
      rol: ""
    })

    setShowForm(false)
  }

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-black mb-2">
          Reportes de Incidentes
        </h1>
        <p className="text-gray-600">
          Gestiona y registra incidentes dentro del campus.
        </p>
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

            {/* Nivel urgencia */}
            <select
              value={formData.urgencia}
              onChange={(e) => setFormData({ ...formData, urgencia: e.target.value })}
              className="border border-gray-400 rounded-lg px-4 py-2 text-black"
            >
              <option value="">Nivel de urgencia</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
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
                    <p className="mt-2 text-sm text-blue-700 font-semibold">
                      Urgencia: {inc.urgencia}
                    </p>
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
