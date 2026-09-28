<?php
include 'db_connect.php';

// Create system_maintenance table
$sql = "CREATE TABLE IF NOT EXISTS system_maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feature_key VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

if ($conn->query($sql) === TRUE) {
    echo "Table 'system_maintenance' created successfully.<br>";
} else {
    echo "Error creating table: " . $conn->error . "<br>";
}

// Seed initial features
$features = [
    ['feature_key' => 'techs_epp', 'module' => 'techs', 'description' => 'Botón de EPP en Módulo de Técnicos'],
    ['feature_key' => 'techs_add', 'module' => 'techs', 'description' => 'Agregar Nuevo Técnico'],
    ['feature_key' => 'clients_add', 'module' => 'clients', 'description' => 'Agregar Nuevo Cliente'],
    ['feature_key' => 'services_add', 'module' => 'services', 'description' => 'Agendar Nuevo Servicio'],
    ['feature_key' => 'reports_generate', 'module' => 'reports', 'description' => 'Generar Reportes PDF'],
    ['feature_key' => 'inventory_edit', 'module' => 'inventory', 'description' => 'Editar Inventario'],
    ['feature_key' => 'calendar_view', 'module' => 'calendar', 'description' => 'Ver Calendario'],
    ['feature_key' => 'quotes_create', 'module' => 'quotes', 'description' => 'Crear Cotización']
];

$stmt = $conn->prepare("INSERT IGNORE INTO system_maintenance (feature_key, module, description, is_active) VALUES (?, ?, ?, 1)");

foreach ($features as $f) {
    $stmt->bind_param("sss", $f['feature_key'], $f['module'], $f['description']);
    $stmt->execute();
}

echo "Initial features seeded.<br>";

$conn->close();
?>
