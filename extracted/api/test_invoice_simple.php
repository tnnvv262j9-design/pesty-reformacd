<?php
include 'db_connect.php';

error_log("TEST INVOICE - Script started");

// Verificar conexión
if (!$conn) {
    error_log("TEST INVOICE - Database connection failed");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de conexión']);
    exit();
}

error_log("TEST INVOICE - Database connected successfully");

// Datos de prueba simples
$test_data = [
    'company_id' => 1,
    'client_id' => 1,
    'issue_date' => '2025-01-26',
    'items' => json_encode([['name' => 'Test Item', 'quantity' => 1, 'price' => 100]]),
    'subtotal' => 100.00,
    'tax' => 16.00,
    'total' => 116.00
];

error_log("TEST INVOICE - Test data prepared");

// SQL simplificado
$sql = "INSERT INTO invoices (company_id, client_id, issue_date, items, subtotal, tax, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    error_log("TEST INVOICE - Failed to prepare statement: " . $conn->error);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en preparación: ' . $conn->error]);
    exit();
}

error_log("TEST INVOICE - Statement prepared successfully");

$stmt->bind_param(
    'iissddd',
    $test_data['company_id'],
    $test_data['client_id'],
    $test_data['issue_date'],
    $test_data['items'],
    $test_data['subtotal'],
    $test_data['tax'],
    $test_data['total']
);

if ($stmt->execute()) {
    error_log("TEST INVOICE - Insert successful, ID: " . $stmt->insert_id);
    echo json_encode(['success' => true, 'message' => 'Test invoice created', 'invoice_id' => $stmt->insert_id]);
} else {
    error_log("TEST INVOICE - Execute failed: " . $stmt->error);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al ejecutar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>