<?php
include 'db_connect.php';

// Este script crea las tablas necesarias para el módulo de cebaderos si no existen.
// Puede ejecutarse manualmente una vez.

$queries = [];

// Tabla de Cebaderos
$queries[] = "CREATE TABLE IF NOT EXISTS cebaderos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    client_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    area_type VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    target VARCHAR(50) NOT NULL,
    bait_product VARCHAR(255),
    active_ingredient VARCHAR(255),
    cofepris_registry VARCHAR(100),
    bait_expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    last_inspection DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (company_id),
    INDEX (client_id),
    UNIQUE KEY unique_code_company (company_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// Tabla de Inspecciones de Cebaderos
$queries[] = "CREATE TABLE IF NOT EXISTS cebadero_inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cebadero_id INT NOT NULL,
    inspection_date DATETIME NOT NULL,
    tech_id INT NOT NULL,
    condition_status VARCHAR(50) NOT NULL,
    activity_level VARCHAR(50) NOT NULL,
    action_taken VARCHAR(50) NOT NULL,
    amount_replenished VARCHAR(50),
    evidence_photo_url VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (cebadero_id),
    INDEX (tech_id),
    FOREIGN KEY (cebadero_id) REFERENCES cebaderos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

echo "Iniciando configuración de base de datos para Cebaderos...<br>";

foreach ($queries as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "Consulta ejecutada correctamente: " . substr($sql, 0, 50) . "...<br>";
    } else {
        echo "Error al ejecutar consulta: " . $conn->error . "<br>";
    }
}

echo "Configuración finalizada.";
$conn->close();
?>