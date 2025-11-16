import { useState, useEffect } from "react"

interface Reporte {
  tenant_id: string
  uuid: string
  tipo_incidente: string
  nivel_urgencia: string
  ubicacion: string
  tipo_usuario: string
  descripcion: string
}

// TODO: Reemplazar con la URL real de tu API Gateway después del deploy
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev"

function App() {
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null)
  const [tenantId, setTenantId] = useState<string>("")
  const [showDetails, setShowDetails] = useState<boolean>(false)

  // Cargar reportes al montar el componente o cuando cambia tenantId
  useEffect(() => {
    if (tenantId) {
      fetchReportes()
    }
  }, [tenantId])

  const fetchReportes = async () => {
    if (!tenantId.trim()) {
      setError("Por favor ingresa un tenant_id")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(
        `${API_BASE_URL}/reporte/listar?tenant_id=${encodeURIComponent(tenantId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.mensaje || "Error al cargar reportes")
      }

      if (data.items && Array.isArray(data.items)) {
        setReportes(data.items)
      } else {
        setReportes([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reportes")
      setReportes([])
    } finally {
      setLoading(false)
    }
  }

  const fetchReporteDetalle = async (uuid: string) => {
    if (!tenantId.trim()) {
      setError("Por favor ingresa un tenant_id")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(
        `${API_BASE_URL}/reporte/${uuid}?tenant_id=${encodeURIComponent(tenantId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.mensaje || "Error al cargar el reporte")
      }

      if (data.item) {
        setSelectedReporte(data.item)
        setShowDetails(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el reporte")
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async (uuid: string) => {
    if (!tenantId.trim()) {
      setError("Por favor ingresa un tenant_id")
      return
    }

    if (!confirm("¿Estás seguro de que deseas eliminar este reporte?")) {
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(
        `${API_BASE_URL}/reporte/${uuid}?tenant_id=${encodeURIComponent(tenantId)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.mensaje || "Error al eliminar el reporte")
      }

      // Recargar la lista después de eliminar
      await fetchReportes()
      if (selectedReporte?.uuid === uuid) {
        setSelectedReporte(null)
        setShowDetails(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el reporte")
    } finally {
      setLoading(false)
    }
  }

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia?.toLowerCase()) {
      case "alta":
        return "text-red-700 bg-red-100"
      case "media":
        return "text-yellow-700 bg-yellow-100"
      case "baja":
        return "text-green-700 bg-green-100"
      default:
        return "text-gray-700 bg-gray-100"
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-black mb-2">
          Panel de Administración
        </h1>
        <p className="text-gray-600">
          Gestiona y administra los reportes de incidentes del campus.
        </p>
      </div>

      {/* Filtro Tenant ID */}
      <div className="max-w-4xl mx-auto mb-8 bg-gray-50 p-6 rounded-lg border border-gray-300">
        <h2 className="text-lg font-semibold text-black mb-4">
          Buscar Reportes
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Ingresa el tenant_id"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="flex-1 border border-gray-400 rounded-lg px-4 py-2 text-black focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                fetchReportes()
              }
            }}
          />
          <button
            onClick={fetchReportes}
            disabled={loading || !tenantId.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
          >
            {loading ? "Cargando..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Mensaje de Error */}
      {error && (
        <div className="max-w-4xl mx-auto mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Vista de Detalles */}
      {showDetails && selectedReporte && (
        <div className="max-w-4xl mx-auto mb-8 bg-gray-50 p-6 rounded-lg border border-gray-300">
          <h2 className="text-lg font-semibold text-black mb-4">
            Detalles del Reporte
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">UUID</p>
              <p className="text-black font-mono text-sm">{selectedReporte.uuid}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Tenant ID</p>
              <p className="text-black font-mono text-sm">{selectedReporte.tenant_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Tipo de Incidente</p>
              <p className="text-black font-semibold">{selectedReporte.tipo_incidente}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Nivel de Urgencia</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getUrgenciaColor(
                  selectedReporte.nivel_urgencia
                )}`}
              >
                {selectedReporte.nivel_urgencia}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Ubicación</p>
              <p className="text-black">📍 {selectedReporte.ubicacion}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Tipo de Usuario</p>
              <p className="text-black">{selectedReporte.tipo_usuario}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600 mb-1">Descripción</p>
              <p className="text-black bg-gray-50 p-3 rounded-lg">{selectedReporte.descripcion}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleEliminar(selectedReporte.uuid)}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Eliminar Reporte
            </button>
            <button
              onClick={() => {
                setShowDetails(false)
                setSelectedReporte(null)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Reportes */}
      <div className="max-w-4xl mx-auto">
        {loading && reportes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Cargando reportes...</p>
          </div>
        ) : reportes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {tenantId
                ? "No hay reportes para este tenant_id."
                : "Ingresa un tenant_id y haz clic en 'Buscar' para ver los reportes."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reportes.map((reporte) => (
              <div
                key={reporte.uuid}
                className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-black text-lg">{reporte.tipo_incidente}</h3>
                    <p className="text-gray-700">📍 {reporte.ubicacion}</p>
                    <p className="text-gray-600 mt-1">{reporte.descripcion}</p>
                    <p className="mt-2 text-sm text-blue-700 font-semibold">
                      Urgencia: {reporte.nivel_urgencia}
                    </p>
                    <p className="mt-1 text-sm text-green-700 font-semibold">
                      Usuario: {reporte.tipo_usuario}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => fetchReporteDetalle(reporte.uuid)}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                    >
                      Ver Detalles
                    </button>
                    <button
                      onClick={() => handleEliminar(reporte.uuid)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
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
