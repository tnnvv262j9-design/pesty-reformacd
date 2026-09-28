<?php
// Script para actualizar la base de datos
include 'db_connect.php';

// 1. Agregar campo 'sanitary_license' a la tabla 'companies'
$check_license_sql = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'sanitary_license'";
$result_license = $conn->query($check_license_sql);

if ($result_license->num_rows == 0) {
    $alter_sql_license = "ALTER TABLE companies ADD COLUMN sanitary_license VARCHAR(255) DEFAULT NULL";
    if ($conn->query($alter_sql_license) === TRUE) {
        echo "Columna 'sanitary_license' agregada a 'companies'.<br>";
    } else {
        echo "Error agregando 'sanitary_license': " . $conn->error . "<br>";
    }
} else {
    echo "Columna 'sanitary_license' ya existe.<br>";
}

// 2. Verificar columnas de facturas (código original)
$check_columns_sql = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'invoices' AND COLUMN_NAME IN ('cfdi_use', 'tax_regime', 'payment_method', 'payment_form', 'issuer_rfc', 'expedition_place', 'currency', 'exchange_rate')";
$result = $conn->query($check_columns_sql);

if ($result->num_rows == 0) {
    // Agregar las nuevas columnas
    $alter_sql = "ALTER TABLE invoices 
        ADD COLUMN cfdi_use VARCHAR(100) DEFAULT NULL,
        ADD COLUMN tax_regime VARCHAR(100) DEFAULT NULL,
        ADD COLUMN payment_method VARCHAR(100) DEFAULT NULL,
        ADD COLUMN payment_form VARCHAR(100) DEFAULT NULL,
        ADD COLUMN issuer_rfc VARCHAR(20) DEFAULT NULL,
        ADD COLUMN expedition_place VARCHAR(200) DEFAULT NULL,
        ADD COLUMN currency VARCHAR(10) DEFAULT 'MXN',
        ADD COLUMN exchange_rate DECIMAL(10,4) DEFAULT 1.0000";

    if ($conn->query($alter_sql) === TRUE) {
        echo "Tabla 'invoices' actualizada con campos mexicanos.<br>";
    } else {
        echo "Error al actualizar la tabla 'invoices': " . $conn->error . "<br>";
    }
} else {
    echo "Columnas de facturas ya existen.<br>";
}

echo json_encode(['success' => true, 'message' => 'Base de datos verificada/actualizada.']);
$conn->close();
?>