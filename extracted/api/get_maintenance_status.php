<?php
header('Content-Type: application/json');
include 'db_connect.php';

// Ensure table exists
$createSql = "CREATE TABLE IF NOT EXISTS system_maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feature_key VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$conn->query($createSql);

// Define features
$initialFeatures = [
    ['feature_key' => 'techs_epp', 'module' => 'techs', 'description' => 'Botón de EPP en Módulo de Técnicos'],
    ['feature_key' => 'techs_add', 'module' => 'techs', 'description' => 'Agregar Nuevo Técnico'],
    ['feature_key' => 'clients_add', 'module' => 'clients', 'description' => 'Agregar Nuevo Cliente'],
    ['feature_key' => 'services_add', 'module' => 'services', 'description' => 'Agendar Nuevo Servicio'],
    
    // New Services Buttons
    ['feature_key' => 'services_report', 'module' => 'services', 'description' => 'Botón Reporte de Servicio'],
    ['feature_key' => 'services_payment', 'module' => 'services', 'description' => 'Botón Registrar Pago'],
    ['feature_key' => 'services_reschedule', 'module' => 'services', 'description' => 'Botón Reagendar Servicio'],
    ['feature_key' => 'services_edit', 'module' => 'services', 'description' => 'Botón Editar Servicio'],
    ['feature_key' => 'services_delete', 'module' => 'services', 'description' => 'Botón Borrar Servicio'],
    ['feature_key' => 'services_map', 'module' => 'services', 'description' => 'Botón Ver en Mapa'],
    ['feature_key' => 'services_whatsapp', 'module' => 'services', 'description' => 'Botón WhatsApp'],
    ['feature_key' => 'services_signature', 'module' => 'services', 'description' => 'Botón Firma Remota'],

    ['feature_key' => 'reports_generate', 'module' => 'reports', 'description' => 'Generar Reportes PDF'],
    ['feature_key' => 'inventory_edit', 'module' => 'inventory', 'description' => 'Editar Inventario'],
    ['feature_key' => 'calendar_view', 'module' => 'calendar', 'description' => 'Ver Calendario'],
    ['feature_key' => 'quotes_create', 'module' => 'quotes', 'description' => 'Crear Cotización']
];

// Seed missing features
$stmt = $conn->prepare("INSERT IGNORE INTO system_maintenance (feature_key, module, description, is_active) VALUES (?, ?, ?, 1)");
if ($stmt) {
    foreach ($initialFeatures as $f) {
        $stmt->bind_param("sss", $f['feature_key'], $f['module'], $f['description']);
        $stmt->execute();
    }
    $stmt->close();
}

// Fetch all
$sql = "SELECT * FROM system_maintenance ORDER BY module, description";
$result = $conn->query($sql);

$features = [];
if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $features[] = $row;
    }
}

echo json_encode(['success' => true, 'features' => $features]);
$conn->close();
?>