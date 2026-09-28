<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Buffer output to prevent headers already sent errors
ob_start();

header('Content-Type: application/json');

try {
    // Check if db_connect.php exists
    if (!file_exists('db_connect.php')) {
        throw new Exception('db_connect.php not found');
    }
    
    include 'db_connect.php';
    
    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    $conn->query("SET NAMES utf8mb4");
    
    // Start session if not already started
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    
    // Validate session (optional, can be disabled for testing if needed)
    // if (!isset($_SESSION['user_id'])) {
    //    throw new Exception('Sesión no válida');
    // }

    // Get input
    $json = file_get_contents('php://input');
    if (!$json) {
        throw new Exception('No input data received');
    }
    
    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    if (!isset($data['service_id']) || !isset($data['analysis_data'])) {
        throw new Exception('Faltan datos requeridos (service_id o analysis_data)');
    }

    $service_id = intval($data['service_id']);
    // Encode analysis data safely
    $analysis_data = json_encode($data['analysis_data'], JSON_UNESCAPED_UNICODE);
    if ($analysis_data === false) {
        throw new Exception('Error encoding JSON data');
    }

    // Check if column exists
    $check_col = $conn->query("SHOW COLUMNS FROM services LIKE 'analysis_data'");
    if (!$check_col) {
         // If query fails, table might not exist or other DB error
         throw new Exception('Database error checking columns: ' . $conn->error);
    }

    if ($check_col->num_rows == 0) {
        // Try to add column
        $alter = $conn->query("ALTER TABLE services ADD COLUMN analysis_data JSON");
        if (!$alter) {
            throw new Exception('Error adding column analysis_data: ' . $conn->error);
        }
    }

    // Update service
    $stmt = $conn->prepare("UPDATE services SET analysis_data = ? WHERE id = ?");
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    
    $stmt->bind_param("si", $analysis_data, $service_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Análisis guardado correctamente']);
    } else {
        throw new Exception('Error al actualizar la base de datos: ' . $stmt->error);
    }

} catch (Exception $e) {
    http_response_code(500); // Send 500 so client knows it failed
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString() // Optional: for debugging
    ]);
}

ob_end_flush();
?>