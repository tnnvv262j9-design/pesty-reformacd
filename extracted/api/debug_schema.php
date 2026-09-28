<?php
include 'db_connect.php';

header('Content-Type: application/json');

$response = [];

// Check clients table
$clients = $conn->query("DESCRIBE clients");
$clientCols = [];
while($row = $clients->fetch_assoc()) {
    $clientCols[] = $row['Field'];
}
$response['clients_columns'] = $clientCols;

// Check cebaderos table
$cebaderos = $conn->query("DESCRIBE cebaderos");
$cebaderosCols = [];
while($row = $cebaderos->fetch_assoc()) {
    $cebaderosCols[] = $row['Field'];
}
$response['cebaderos_columns'] = $cebaderosCols;

echo json_encode($response, JSON_PRETTY_PRINT);
?>